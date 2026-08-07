import {
  assertProductionLmsSchema,
  planDefinition,
  planForStripePrice,
  stableId,
  stripeRetrieve,
  type LmsPlanDefinition,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

type Metadata = Record<string, string>;

function parseSignature(header: string) {
  const values = new Map<string, string[]>();
  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2);
    if (!key || !value) continue;
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return { timestamp: values.get('t')?.[0], signatures: values.get('v1') ?? [] };
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

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const { timestamp, signatures } = parseSignature(header);
  if (!timestamp || signatures.length === 0) return false;
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp) || Math.abs(Date.now() / 1000 - numericTimestamp) > 300) return false;
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

function recordValue(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown) {
  return value === true;
}

function metadataValue(value: unknown): Metadata {
  const record = recordValue(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function isoFromUnix(value: unknown) {
  const seconds = numberValue(value);
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

function stripeStatus(value: unknown) {
  const status = stringValue(value);
  if (status === 'canceled') return 'cancelled';
  if (
    status === 'incomplete'
    || status === 'incomplete_expired'
    || status === 'trialing'
    || status === 'active'
    || status === 'past_due'
    || status === 'unpaid'
    || status === 'paused'
  ) return status;
  return 'incomplete';
}

function firstSubscriptionItem(subscription: Record<string, unknown>) {
  const items = recordValue(subscription.items);
  const data = Array.isArray(items?.data) ? items.data : [];
  return data.length && recordValue(data[0]) ? recordValue(data[0]) : null;
}

function subscriptionPriceId(subscription: Record<string, unknown>) {
  const item = firstSubscriptionItem(subscription);
  return stringValue(recordValue(item?.price)?.id);
}

function subscriptionPeriod(subscription: Record<string, unknown>) {
  const item = firstSubscriptionItem(subscription);
  return {
    start: isoFromUnix(subscription.current_period_start ?? item?.current_period_start),
    end: isoFromUnix(subscription.current_period_end ?? item?.current_period_end),
  };
}

function invoiceSubscriptionId(invoice: Record<string, unknown>) {
  const direct = stringValue(invoice.subscription);
  if (direct) return direct;
  const parent = recordValue(invoice.parent);
  const details = recordValue(parent?.subscription_details);
  return stringValue(details?.subscription);
}

async function canonicalStripeEvent(
  payload: string,
  signatureHeader: string | null,
  env: ProductionLmsEnv,
) {
  let supplied: StripeEvent;
  try {
    supplied = JSON.parse(payload) as StripeEvent;
  } catch {
    throw new Error('invalid_payload');
  }
  if (!supplied.id || !/^evt_[A-Za-z0-9]+$/.test(supplied.id) || !supplied.type) {
    throw new Error('invalid_event');
  }

  if (
    env.STRIPE_LMS_WEBHOOK_SECRET
    && signatureHeader
    && await verifyStripeSignature(payload, signatureHeader, env.STRIPE_LMS_WEBHOOK_SECRET)
  ) {
    if (!supplied.data?.object) throw new Error('invalid_event');
    return supplied;
  }

  if (!env.STRIPE_SECRET_KEY) throw new Error('stripe_verification_not_configured');
  const canonical = await stripeRetrieve<StripeEvent>(
    env,
    `/events/${encodeURIComponent(supplied.id)}`,
  );
  if (
    canonical.id !== supplied.id
    || canonical.type !== supplied.type
    || !canonical.data?.object
  ) {
    throw new Error('invalid_event');
  }
  return canonical;
}

async function ensureTeamOrganisation(
  db: D1Database,
  accountId: string,
  subscriptionId: string,
  plan: LmsPlanDefinition,
) {
  if (plan.seatLimit <= 1) return;
  const account = await db.prepare(`
    SELECT display_name, organisation_name FROM customer_accounts WHERE id = ?
  `).bind(accountId).first<{ display_name: string | null; organisation_name: string | null }>();
  const organisationId = await stableId('lms-organisation', subscriptionId);
  const name = account?.organisation_name || account?.display_name || 'Learning organisation';
  const memberId = await stableId('lms-member', `${organisationId}:${accountId}`);
  await db.batch([
    db.prepare(`
      INSERT INTO lms_organisations (id, owner_account_id, subscription_id, name, status)
      VALUES (?, ?, ?, ?, 'active')
      ON CONFLICT(subscription_id) DO UPDATE SET
        name = COALESCE(NULLIF(lms_organisations.name, ''), excluded.name),
        status = 'active', updated_at = CURRENT_TIMESTAMP
    `).bind(organisationId, accountId, subscriptionId, name),
    db.prepare(`
      INSERT INTO lms_organisation_members (
        id, organisation_id, account_id, role, status, joined_at
      ) VALUES (?, ?, ?, 'owner', 'active', CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP
    `).bind(memberId, organisationId, accountId),
  ]);
}

async function upsertSubscription(
  db: D1Database,
  object: Record<string, unknown>,
  checkoutSessionId: string | null = null,
) {
  const metadata = metadataValue(object.metadata);
  const accountId = metadata.ja_account_id;
  const stripeSubscriptionId = stringValue(object.id);
  const stripeCustomerId = stringValue(object.customer);
  const priceId = subscriptionPriceId(object);
  const plan = planDefinition(metadata.plan_id) ?? planForStripePrice(priceId);
  if (!accountId || !stripeSubscriptionId || !stripeCustomerId || !plan) return false;
  const period = subscriptionPeriod(object);
  const status = stripeStatus(object.status);
  const subscriptionId = await stableId('lms-subscription', stripeSubscriptionId);
  const cancelledAt = isoFromUnix(object.canceled_at);

  await db.prepare(`
    INSERT INTO lms_subscriptions (
      id, account_id, plan_id, stripe_customer_id,
      stripe_subscription_id, stripe_checkout_session_id,
      status, seat_limit, current_period_start, current_period_end,
      cancel_at_period_end, cancelled_at, grace_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(stripe_subscription_id) DO UPDATE SET
      account_id = excluded.account_id,
      plan_id = excluded.plan_id,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_checkout_session_id = COALESCE(excluded.stripe_checkout_session_id, lms_subscriptions.stripe_checkout_session_id),
      status = excluded.status,
      seat_limit = excluded.seat_limit,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      cancelled_at = excluded.cancelled_at,
      grace_expires_at = CASE WHEN excluded.status IN ('active', 'trialing') THEN NULL ELSE lms_subscriptions.grace_expires_at END,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    subscriptionId,
    accountId,
    plan.id,
    stripeCustomerId,
    stripeSubscriptionId,
    checkoutSessionId,
    status,
    plan.seatLimit,
    period.start,
    period.end,
    booleanValue(object.cancel_at_period_end) ? 1 : 0,
    cancelledAt,
  ).run();

  await db.prepare(`
    UPDATE lms_identity_profiles
    SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
  `).bind(stripeCustomerId, accountId).run();

  if (status === 'active' || status === 'trialing') {
    await ensureTeamOrganisation(db, accountId, subscriptionId, plan);
  }
  return true;
}

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  try {
    await assertProductionLmsSchema(env.DB);
  } catch (error) {
    return Response.json({
      error: 'lms_initialisation_failed',
      message: error instanceof Error ? error.message : 'The LMS database could not be initialised.',
    }, { status: 503 });
  }

  const payload = await request.text();
  let event: StripeEvent;
  try {
    event = await canonicalStripeEvent(payload, request.headers.get('Stripe-Signature'), env);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid_event';
    return Response.json({ error: code }, { status: code === 'stripe_verification_not_configured' ? 503 : 400 });
  }
  const canonicalPayload = JSON.stringify(event);

  const insert = await env.DB.prepare(`
    INSERT OR IGNORE INTO webhook_events (
      id, source, external_event_id, event_type,
      payload_json, processing_status
    ) VALUES (?, 'stripe-lms', ?, ?, ?, 'processing')
  `).bind(`stripe-lms-${event.id}`, event.id, event.type, canonicalPayload).run();
  if ((insert.meta?.changes ?? 0) === 0) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    const object = event.data.object;
    const metadata = metadataValue(object.metadata);

    if (event.type === 'checkout.session.completed') {
      const checkoutSessionId = stringValue(object.id);
      const checkoutId = metadata.lms_checkout_id;
      const stripeSubscriptionId = stringValue(object.subscription);
      const stripeCustomerId = stringValue(object.customer);
      const accountId = metadata.ja_account_id;
      const plan = planDefinition(metadata.plan_id);
      const paymentStatus = stringValue(object.payment_status);
      const initialStatus = paymentStatus === 'paid' || paymentStatus === 'no_payment_required'
        ? 'active'
        : 'incomplete';

      if (checkoutId) {
        await env.DB.prepare(`
          UPDATE lms_checkout_sessions
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(checkoutId).run();
      }

      if (stripeSubscriptionId && stripeCustomerId && accountId && plan) {
        const subscriptionId = await stableId('lms-subscription', stripeSubscriptionId);
        await env.DB.prepare(`
          INSERT INTO lms_subscriptions (
            id, account_id, plan_id, stripe_customer_id,
            stripe_subscription_id, stripe_checkout_session_id,
            status, seat_limit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(stripe_subscription_id) DO UPDATE SET
            account_id = excluded.account_id,
            plan_id = excluded.plan_id,
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_checkout_session_id = excluded.stripe_checkout_session_id,
            status = excluded.status,
            seat_limit = excluded.seat_limit,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          subscriptionId,
          accountId,
          plan.id,
          stripeCustomerId,
          stripeSubscriptionId,
          checkoutSessionId,
          initialStatus,
          plan.seatLimit,
        ).run();
        if (initialStatus === 'active') {
          await ensureTeamOrganisation(env.DB, accountId, subscriptionId, plan);
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      const checkoutId = metadata.lms_checkout_id;
      if (checkoutId) {
        await env.DB.prepare(`
          UPDATE lms_checkout_sessions
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(checkoutId).run();
      }
    } else if (
      event.type === 'customer.subscription.created'
      || event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted'
    ) {
      await upsertSubscription(env.DB, object);
    } else if (event.type === 'invoice.paid') {
      const subscriptionId = invoiceSubscriptionId(object);
      if (subscriptionId) {
        await env.DB.prepare(`
          UPDATE lms_subscriptions
          SET status = 'active', grace_expires_at = NULL,
              last_payment_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).bind(subscriptionId).run();
      }
    } else if (event.type === 'invoice.payment_failed') {
      const subscriptionId = invoiceSubscriptionId(object);
      if (subscriptionId) {
        await env.DB.prepare(`
          UPDATE lms_subscriptions
          SET status = 'past_due',
              grace_expires_at = datetime(CURRENT_TIMESTAMP, '+7 days'),
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).bind(subscriptionId).run();
      }
    }

    await env.DB.prepare(`
      UPDATE webhook_events
      SET processing_status = 'processed', processed_at = CURRENT_TIMESTAMP
      WHERE source = 'stripe-lms' AND external_event_id = ?
    `).bind(event.id).run();
    return Response.json({ received: true });
  } catch (error) {
    await env.DB.prepare(`
      UPDATE webhook_events
      SET processing_status = 'failed', error_message = ?, processed_at = CURRENT_TIMESTAMP
      WHERE source = 'stripe-lms' AND external_event_id = ?
    `).bind(error instanceof Error ? error.message : 'Unknown LMS webhook error', event.id).run();
    return Response.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }
};
