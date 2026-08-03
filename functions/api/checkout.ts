interface Env {
  DB?: D1Database;
  STRIPE_SECRET_KEY?: string;
  SITE_URL?: string;
}

type CheckoutRequest = {
  courseId?: string;
  quantity?: number;
};

type CoursePriceRow = {
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

  const courseId = input.courseId?.trim();
  const quantity = Number(input.quantity);

  if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    return Response.json({
      error: 'invalid_checkout_request',
      message: 'Select a valid course and a licence quantity between 1 and 9,999.',
    }, { status: 400 });
  }

  const row = await env.DB.prepare(`
    SELECT
      c.id AS course_id,
      c.title,
      c.slug,
      c.provider_id,
      t.id AS tier_id,
      t.aptenvo_net_pence AS unit_net_pence,
      t.vat_pence AS unit_vat_pence,
      t.aptenvo_gross_pence AS unit_gross_pence,
      sp.stripe_price_id
    FROM courses c
    INNER JOIN course_price_tiers t ON t.course_id = c.id
    LEFT JOIN stripe_prices sp ON sp.price_tier_id = t.id
    WHERE c.id = ?
      AND c.status = 'published'
      AND t.status = 'active'
      AND ? >= t.minimum_quantity
      AND (t.maximum_quantity IS NULL OR ? <= t.maximum_quantity)
    ORDER BY t.minimum_quantity DESC
    LIMIT 1
  `).bind(courseId, quantity, quantity).first<CoursePriceRow>();

  if (!row) {
    return Response.json({
      error: 'course_or_price_not_found',
      message: 'The selected course or quantity price could not be found.',
    }, { status: 404 });
  }

  const orderId = `order-${crypto.randomUUID()}`;
  const orderItemId = `order-item-${crypto.randomUUID()}`;
  const lineNetPence = row.unit_net_pence * quantity;
  const lineVatPence = row.unit_vat_pence * quantity;
  const lineGrossPence = row.unit_gross_pence * quantity;

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO orders (
        id, status, currency, subtotal_pence, vat_pence, total_pence
      ) VALUES (?, 'awaiting_payment', 'GBP', ?, ?, ?)
    `).bind(orderId, lineNetPence, lineVatPence, lineGrossPence),
    env.DB.prepare(`
      INSERT INTO order_items (
        id, order_id, course_id, price_tier_id, quantity,
        unit_net_pence, unit_vat_pence, unit_gross_pence,
        line_net_pence, line_vat_pence, line_gross_pence,
        fulfilment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started')
    `).bind(
      orderItemId,
      orderId,
      row.course_id,
      row.tier_id,
      quantity,
      row.unit_net_pence,
      row.unit_vat_pence,
      row.unit_gross_pence,
      lineNetPence,
      lineVatPence,
      lineGrossPence,
    ),
  ]);

  const siteUrl = safeSiteUrl(request, env.SITE_URL);
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${siteUrl}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${siteUrl}/courses/${row.slug}?checkout=cancelled`);
  form.set('customer_creation', 'always');
  form.set('billing_address_collection', 'auto');
  form.set('metadata[aptenvo_order_id]', orderId);
  form.set('metadata[course_id]', row.course_id);
  form.set('metadata[price_tier_id]', row.tier_id);
  form.set('metadata[quantity]', String(quantity));
  form.set('payment_intent_data[metadata][aptenvo_order_id]', orderId);
  form.set('payment_intent_data[metadata][course_id]', row.course_id);

  if (row.stripe_price_id) {
    form.set('line_items[0][price]', row.stripe_price_id);
  } else {
    form.set('line_items[0][price_data][currency]', 'gbp');
    form.set('line_items[0][price_data][unit_amount]', String(row.unit_gross_pence));
    form.set('line_items[0][price_data][tax_behavior]', 'inclusive');
    form.set('line_items[0][price_data][product_data][name]', row.title);
    form.set('line_items[0][price_data][product_data][description]', 'Online training licence supplied through Aptenvo. Price includes VAT.');
    form.set('line_items[0][price_data][product_data][metadata][course_id]', row.course_id);
    form.set('line_items[0][price_data][product_data][metadata][provider_id]', row.provider_id);
  }

  form.set('line_items[0][quantity]', String(quantity));

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
  }, { headers: { 'Cache-Control': 'no-store' } });
};
