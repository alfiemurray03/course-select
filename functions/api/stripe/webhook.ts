interface Env {
  DB?: D1Database;
  STRIPE_WEBHOOK_SECRET?: string;
}

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function parseSignature(header: string) {
  const values = new Map<string, string[]>();
  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2);
    if (!key || !value) continue;
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return {
    timestamp: values.get('t')?.[0],
    signatures: values.get('v1') ?? [],
  };
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const { timestamp, signatures } = parseSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return false;
  if (Math.abs(Date.now() / 1000 - numericTimestamp) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = bytesToHex(digest);
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function recordValue(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return Response.json({ error: 'database_not_bound' }, { status: 503 });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  const signatureHeader = request.headers.get('Stripe-Signature');
  if (!signatureHeader) {
    return Response.json({ error: 'missing_signature' }, { status: 400 });
  }

  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, signatureHeader, env.STRIPE_WEBHOOK_SECRET))) {
    return Response.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (!event.id || !event.type || !event.data?.object) {
    return Response.json({ error: 'invalid_event' }, { status: 400 });
  }

  const insert = await env.DB.prepare(`
    INSERT OR IGNORE INTO webhook_events (
      id, source, external_event_id, event_type, payload_json, processing_status
    ) VALUES (?, 'stripe', ?, ?, ?, 'processing')
  `).bind(`stripe-event-${event.id}`, event.id, event.type, payload).run();

  if ((insert.meta?.changes ?? 0) === 0) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    const object = event.data.object;
    const metadata = recordValue(object.metadata) ?? {};
    const orderId = stringValue(metadata.aptenvo_order_id);

    if (event.type === 'checkout.session.completed' && orderId) {
      const customerDetails = recordValue(object.customer_details);
      const email = stringValue(customerDetails?.email);
      const paymentIntent = stringValue(object.payment_intent);
      const stripeCustomer = stringValue(object.customer);
      const sessionId = stringValue(object.id);

      await env.DB.batch([
        env.DB.prepare(`
          UPDATE orders
          SET status = 'paid',
              stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id),
              stripe_payment_intent_id = ?,
              stripe_customer_id = ?,
              customer_email = ?,
              paid_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(sessionId, paymentIntent, stripeCustomer, email, orderId),
        env.DB.prepare(`
          UPDATE order_items
          SET fulfilment_status = 'queued', updated_at = CURRENT_TIMESTAMP
          WHERE order_id = ? AND fulfilment_status = 'not_started'
        `).bind(orderId),
      ]);
    } else if (event.type === 'checkout.session.expired' && orderId) {
      await env.DB.prepare(`
        UPDATE orders
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'awaiting_payment'
      `).bind(orderId).run();
    } else if (event.type === 'payment_intent.payment_failed' && orderId) {
      await env.DB.prepare(`
        UPDATE orders
        SET status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(orderId).run();
    } else if (event.type === 'charge.refunded') {
      const paymentIntent = stringValue(object.payment_intent);
      const refunded = object.refunded === true;
      if (paymentIntent) {
        await env.DB.prepare(`
          UPDATE orders
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE stripe_payment_intent_id = ?
        `).bind(refunded ? 'refunded' : 'partially_refunded', paymentIntent).run();
      }
    }

    await env.DB.prepare(`
      UPDATE webhook_events
      SET processing_status = 'processed', processed_at = CURRENT_TIMESTAMP
      WHERE source = 'stripe' AND external_event_id = ?
    `).bind(event.id).run();

    return Response.json({ received: true });
  } catch (error) {
    await env.DB.prepare(`
      UPDATE webhook_events
      SET processing_status = 'failed', error_message = ?, processed_at = CURRENT_TIMESTAMP
      WHERE source = 'stripe' AND external_event_id = ?
    `).bind(error instanceof Error ? error.message : 'Unknown processing error', event.id).run();

    return Response.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }
};
