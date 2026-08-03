interface Env {
  DB?: D1Database;
  STRIPE_SECRET_KEY?: string;
  SITE_URL?: string;
}

const ONLINE_LICENCE_LIMIT = 25;

type CheckoutItemRequest = {
  courseId?: string;
  quantity?: number;
};

type CustomerRequest = {
  type?: string;
  legalFirstName?: string;
  legalLastName?: string;
  enrolmentEmail?: string;
  organisationName?: string;
  providerConsent?: boolean;
};

type CheckoutRequest = {
  items?: CheckoutItemRequest[];
  customer?: CustomerRequest;
};

type CoursePriceRow = {
  position: number;
  quantity: number;
  course_id: string;
  title: string;
  slug: string;
  provider_id: string;
  tier_id: string;
  unit_net_pence: number;
  unit_vat_pence: number;
  unit_gross_pence: number;
  stripe_price_id: string | null;
};

type ValidCustomer = {
  type: 'individual' | 'business';
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
  organisationName: string | null;
};

function safeSiteUrl(request: Request, configured?: string) {
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function normaliseItems(items: CheckoutItemRequest[]) {
  const combined = new Map<string, number>();

  for (const item of items) {
    const courseId = item.courseId?.trim();
    const quantity = Number(item.quantity);
    if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > ONLINE_LICENCE_LIMIT) return null;
    combined.set(courseId, (combined.get(courseId) ?? 0) + quantity);
  }

  return [...combined.entries()].map(([courseId, quantity]) => ({ courseId, quantity }));
}

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > maximumLength || /[\u0000-\u001F\u007F]/.test(cleaned)) return null;
  return cleaned;
}

function normaliseCustomer(customer?: CustomerRequest): ValidCustomer | null {
  if (!customer || (customer.type !== 'individual' && customer.type !== 'business')) return null;
  if (customer.providerConsent !== true) return null;

  const legalFirstName = cleanText(customer.legalFirstName, 80);
  const legalLastName = cleanText(customer.legalLastName, 80);
  const enrolmentEmail = typeof customer.enrolmentEmail === 'string'
    ? customer.enrolmentEmail.trim().toLowerCase()
    : '';
  const organisationName = typeof customer.organisationName === 'string' && customer.organisationName.trim()
    ? cleanText(customer.organisationName, 160)
    : null;

  if (!legalFirstName || !legalLastName) return null;
  if (enrolmentEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enrolmentEmail)) return null;
  if (customer.type === 'business' && customer.organisationName?.trim() && !organisationName) return null;

  return {
    type: customer.type,
    legalFirstName,
    legalLastName,
    enrolmentEmail,
    organisationName,
  };
}

async function identityId(prefix: string, value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex.slice(0, 40)}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return Response.json({
      error: 'database_not_bound',
      message: 'The Aptenvo database is not connected yet. Add the D1 binding named DB.',
    }, { status: 503 });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({
      error: 'stripe_not_connected',
      message: 'Stripe checkout is ready in the code but the STRIPE_SECRET_KEY secret has not been added to Cloudflare yet.',
    }, { status: 503 });
  }

  let input: CheckoutRequest;
  try {
    input = await request.json<CheckoutRequest>();
  } catch {
    return Response.json({ error: 'invalid_json', message: 'A valid JSON request body is required.' }, { status: 400 });
  }

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > ONLINE_LICENCE_LIMIT) {
    return Response.json({
      error: 'invalid_basket',
      message: `Your online basket must contain between 1 and ${ONLINE_LICENCE_LIMIT} different courses.`,
    }, { status: 400 });
  }

  const customer = normaliseCustomer(input.customer);
  if (!customer) {
    return Response.json({
      error: 'invalid_customer_details',
      message: 'Select Individual or Business and provide the learner’s legal first name, legal last name, valid enrolment email and required consent before checkout.',
    }, { status: 400 });
  }

  const items = normaliseItems(input.items);
  if (!items || items.length < 1 || items.length > ONLINE_LICENCE_LIMIT) {
    return Response.json({
      error: 'invalid_checkout_request',
      message: `Each basket item must contain a valid course and a licence quantity between 1 and ${ONLINE_LICENCE_LIMIT}.`,
    }, { status: 400 });
  }

  const totalLicences = items.reduce((total, item) => total + item.quantity, 0);
  if (totalLicences > ONLINE_LICENCE_LIMIT) {
    return Response.json({
      error: 'large_order_required',
      message: `Online checkout is limited to ${ONLINE_LICENCE_LIMIT} licences in total. Please contact Aptenvo so we can arrange an order of ${ONLINE_LICENCE_LIMIT + 1} licences or more directly.`,
    }, { status: 400 });
  }

  const requestedJson = JSON.stringify(items.map((item, position) => ({ ...item, position })));
  const result = await env.DB.prepare(`
    WITH requested AS (
      SELECT
        CAST(json_extract(value, '$.position') AS INTEGER) AS position,
        TRIM(json_extract(value, '$.courseId')) AS course_id,
        CAST(json_extract(value, '$.quantity') AS INTEGER) AS quantity
      FROM json_each(?)
    )
    SELECT
      r.position,
      r.quantity,
      c.id AS course_id,
      c.title,
      c.slug,
      c.provider_id,
      t.id AS tier_id,
      t.aptenvo_net_pence AS unit_net_pence,
      t.vat_pence AS unit_vat_pence,
      t.aptenvo_gross_pence AS unit_gross_pence,
      sp.stripe_price_id
    FROM requested r
    INNER JOIN courses c ON c.id = r.course_id
    INNER JOIN course_price_tiers t ON t.course_id = c.id
    LEFT JOIN stripe_prices sp ON sp.price_tier_id = t.id
    WHERE c.status = 'published'
      AND t.status = 'active'
      AND r.quantity >= t.minimum_quantity
      AND (t.maximum_quantity IS NULL OR r.quantity <= t.maximum_quantity)
    ORDER BY r.position ASC
  `).bind(requestedJson).all<CoursePriceRow>();

  const rows = result.results ?? [];
  if (rows.length !== items.length) {
    return Response.json({
      error: 'course_or_price_not_found',
      message: 'One or more selected courses or quantity prices could not be found. Please review your basket.',
    }, { status: 404 });
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS order_enrolment_details (
      order_id TEXT PRIMARY KEY,
      customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'business')),
      legal_first_name TEXT NOT NULL,
      legal_last_name TEXT NOT NULL,
      enrolment_email TEXT NOT NULL,
      organisation_name TEXT,
      learner_id TEXT,
      provider_sharing_consent INTEGER NOT NULL DEFAULT 0 CHECK (provider_sharing_consent IN (0, 1)),
      consent_recorded_at TEXT,
      additional_learner_details_required INTEGER NOT NULL DEFAULT 0 CHECK (additional_learner_details_required IN (0, 1)),
      fulfilment_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (fulfilment_status IN ('pending_payment', 'awaiting_enrolment', 'awaiting_additional_learners', 'enrolling', 'enrolled', 'cancelled', 'payment_failed')),
      ready_for_enrolment_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE SET NULL
    )
  `).run();

  const orderId = `order-${crypto.randomUUID()}`;
  const enrolmentRecordId = `enrolment-details-${crypto.randomUUID()}`;
  const customerId = await identityId('customer', customer.enrolmentEmail);
  const learnerId = await identityId('learner', customer.enrolmentEmail);
  const customerAccountType = customer.type === 'business' ? 'organisation' : 'individual';
  const additionalLearnerDetailsRequired = rows.some((row) => row.quantity > 1) ? 1 : 0;
  const totals = rows.reduce((sum, row) => ({
    net: sum.net + row.unit_net_pence * row.quantity,
    vat: sum.vat + row.unit_vat_pence * row.quantity,
    gross: sum.gross + row.unit_gross_pence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 });

  const orderStatements = [
    env.DB.prepare(`
      INSERT INTO customers (id, email, first_name, last_name, account_type, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        account_type = excluded.account_type,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      customerId,
      customer.enrolmentEmail,
      customer.legalFirstName,
      customer.legalLastName,
      customerAccountType,
    ),
    env.DB.prepare(`
      INSERT INTO learners (id, customer_id, email, first_name, last_name, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(id) DO UPDATE SET
        customer_id = excluded.customer_id,
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      learnerId,
      customerId,
      customer.enrolmentEmail,
      customer.legalFirstName,
      customer.legalLastName,
    ),
    env.DB.prepare(`
      INSERT INTO orders (
        id, customer_id, status, currency, subtotal_pence, vat_pence, total_pence, customer_email
      ) VALUES (?, ?, 'awaiting_payment', 'GBP', ?, ?, ?, ?)
    `).bind(orderId, customerId, totals.net, totals.vat, totals.gross, customer.enrolmentEmail),
    env.DB.prepare(`
      INSERT INTO order_enrolment_details (
        order_id, customer_type, legal_first_name, legal_last_name,
        enrolment_email, organisation_name, learner_id,
        provider_sharing_consent, consent_recorded_at,
        additional_learner_details_required, fulfilment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, 'pending_payment')
    `).bind(
      orderId,
      customer.type,
      customer.legalFirstName,
      customer.legalLastName,
      customer.enrolmentEmail,
      customer.organisationName,
      learnerId,
      additionalLearnerDetailsRequired,
    ),
    ...rows.map((row) => {
      const lineNetPence = row.unit_net_pence * row.quantity;
      const lineVatPence = row.unit_vat_pence * row.quantity;
      const lineGrossPence = row.unit_gross_pence * row.quantity;
      return env.DB!.prepare(`
        INSERT INTO order_items (
          id, order_id, course_id, price_tier_id, quantity,
          unit_net_pence, unit_vat_pence, unit_gross_pence,
          line_net_pence, line_vat_pence, line_gross_pence,
          fulfilment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started')
      `).bind(
        `order-item-${crypto.randomUUID()}`,
        orderId,
        row.course_id,
        row.tier_id,
        row.quantity,
        row.unit_net_pence,
        row.unit_vat_pence,
        row.unit_gross_pence,
        lineNetPence,
        lineVatPence,
        lineGrossPence,
      );
    }),
  ];

  await env.DB.batch(orderStatements);

  const siteUrl = safeSiteUrl(request, env.SITE_URL);
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${siteUrl}/basket?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${siteUrl}/basket?checkout=cancelled`);
  form.set('customer_creation', 'always');
  form.set('customer_email', customer.enrolmentEmail);
  form.set('billing_address_collection', 'auto');
  form.set('client_reference_id', orderId);
  form.set('metadata[aptenvo_order_id]', orderId);
  form.set('metadata[enrolment_record_id]', enrolmentRecordId);
  form.set('metadata[customer_type]', customer.type);
  form.set('metadata[basket_item_count]', String(rows.length));
  form.set('metadata[licence_count]', String(totalLicences));
  form.set('payment_intent_data[metadata][aptenvo_order_id]', orderId);

  rows.forEach((row, index) => {
    if (row.stripe_price_id) {
      form.set(`line_items[${index}][price]`, row.stripe_price_id);
    } else {
      form.set(`line_items[${index}][price_data][currency]`, 'gbp');
      form.set(`line_items[${index}][price_data][unit_amount]`, String(row.unit_gross_pence));
      form.set(`line_items[${index}][price_data][tax_behavior]`, 'inclusive');
      form.set(`line_items[${index}][price_data][product_data][name]`, row.title);
      form.set(`line_items[${index}][price_data][product_data][description]`, 'Online training licence sold by JA Group Services Ltd through Aptenvo and delivered through the course provider learning platform. Price includes VAT.');
      form.set(`line_items[${index}][price_data][product_data][metadata][course_id]`, row.course_id);
      form.set(`line_items[${index}][price_data][product_data][metadata][provider_id]`, row.provider_id);
    }
    form.set(`line_items[${index}][quantity]`, String(row.quantity));
  });

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  const stripeData = await stripeResponse.json() as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!stripeResponse.ok || !stripeData.id || !stripeData.url) {
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(orderId),
      env.DB.prepare(`
        UPDATE order_enrolment_details
        SET fulfilment_status = 'payment_failed', updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).bind(orderId),
    ]);

    return Response.json({
      error: 'stripe_checkout_failed',
      message: stripeData.error?.message ?? 'Stripe was unable to create the checkout session.',
    }, { status: 502 });
  }

  await env.DB.prepare(`
    UPDATE orders
    SET stripe_checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(stripeData.id, orderId).run();

  return Response.json({
    id: stripeData.id,
    url: stripeData.url,
    orderId,
    itemCount: rows.length,
    licenceCount: totalLicences,
  }, { headers: { 'Cache-Control': 'no-store' } });
};