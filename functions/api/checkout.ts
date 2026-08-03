interface Env {
  DB?: D1Database;
  STRIPE_SECRET_KEY?: string;
  SITE_URL?: string;
}

type CheckoutItemRequest = {
  courseId?: string;
  quantity?: number;
};

type CheckoutRequest = {
  items?: CheckoutItemRequest[];
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
    if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return null;
    combined.set(courseId, Math.min(9999, (combined.get(courseId) ?? 0) + quantity));
  }

  return [...combined.entries()].map(([courseId, quantity]) => ({ courseId, quantity }));
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

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 25) {
    return Response.json({
      error: 'invalid_basket',
      message: 'Your basket must contain between 1 and 25 different courses.',
    }, { status: 400 });
  }

  const items = normaliseItems(input.items);
  if (!items || items.length < 1 || items.length > 25) {
    return Response.json({
      error: 'invalid_checkout_request',
      message: 'Each basket item must contain a valid course and a licence quantity between 1 and 9,999.',
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

  const orderId = `order-${crypto.randomUUID()}`;
  const totals = rows.reduce((sum, row) => ({
    net: sum.net + row.unit_net_pence * row.quantity,
    vat: sum.vat + row.unit_vat_pence * row.quantity,
    gross: sum.gross + row.unit_gross_pence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 });

  const orderStatements = [
    env.DB.prepare(`
      INSERT INTO orders (
        id, status, currency, subtotal_pence, vat_pence, total_pence
      ) VALUES (?, 'awaiting_payment', 'GBP', ?, ?, ?)
    `).bind(orderId, totals.net, totals.vat, totals.gross),
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
  form.set('billing_address_collection', 'auto');
  form.set('metadata[aptenvo_order_id]', orderId);
  form.set('metadata[basket_item_count]', String(rows.length));
  form.set('payment_intent_data[metadata][aptenvo_order_id]', orderId);

  rows.forEach((row, index) => {
    if (row.stripe_price_id) {
      form.set(`line_items[${index}][price]`, row.stripe_price_id);
    } else {
      form.set(`line_items[${index}][price_data][currency]`, 'gbp');
      form.set(`line_items[${index}][price_data][unit_amount]`, String(row.unit_gross_pence));
      form.set(`line_items[${index}][price_data][tax_behavior]`, 'inclusive');
      form.set(`line_items[${index}][price_data][product_data][name]`, row.title);
      form.set(`line_items[${index}][price_data][product_data][description]`, 'Online training licence supplied through Aptenvo. Price includes VAT.');
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
    await env.DB.prepare(`
      UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(orderId).run();

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
    licenceCount: rows.reduce((total, row) => total + row.quantity, 0),
  }, { headers: { 'Cache-Control': 'no-store' } });
};
