import {
  ensureProfessionalTrainingOrderSchema,
  markProfessionalTrainingOrderFailed,
  markProfessionalTrainingOrderPaid,
} from '../../_shared/professional-training-orders';
import { requireProductionLms } from '../../_shared/production-lms';
import type { ProfessionalTrainingEnv } from '../../_shared/professional-training-checkout';

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';

type CentralStatus = {
  checkoutRequests?: Array<{
    id?: string;
    order_reference?: string;
    status?: string;
    stripe_checkout_session_id?: string;
    stripe_customer_id?: string;
  }>;
  transactions?: Array<{
    event_type?: string;
    order_reference?: string;
    status?: string;
    stripe_payment_intent_id?: string;
    stripe_customer_id?: string;
  }>;
};

async function centralStatus(env: ProfessionalTrainingEnv, orderId: string) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  if (!token) throw new Error('The Head Office Central Payments connection is not configured.');
  const response = await fetch(`${base}/api/v1/payments/status?orderReference=${encodeURIComponent(orderId)}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error && typeof data.error === 'object' ? data.error as Record<string, unknown> : null;
    throw new Error(typeof detail?.message === 'string' ? detail.message : `Head Office Central Payments returned HTTP ${response.status}.`);
  }
  return data as CentralStatus;
}

async function deletePendingLearnerFiles(env: ProfessionalTrainingEnv, orderId: string) {
  if (!env.DB || !env.LEARNER_UPLOADS) return;
  const result = await env.DB.prepare(`SELECT storage_key FROM order_learner_uploads WHERE order_id=?`).bind(orderId).all<{ storage_key: string }>();
  const keys = (result.results ?? []).map((row) => row.storage_key).filter(Boolean);
  if (keys.length) await env.LEARNER_UPLOADS.delete(keys).catch(() => undefined);
}

export const onRequestGet: PagesFunction<ProfessionalTrainingEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireProductionLms(request, env);
  if (auth.response || !auth.session) return auth.response ?? Response.json({ error: 'sign_in_required' }, { status: 401 });

  const orderId = new URL(request.url).searchParams.get('orderId')?.trim() ?? '';
  if (!/^order-[0-9a-f-]{36}$/i.test(orderId)) {
    return Response.json({ error: 'invalid_order_reference', message: 'A valid Professional Training order reference is required.' }, { status: 400 });
  }

  await ensureProfessionalTrainingOrderSchema(env.DB);
  const local = await env.DB.prepare(`SELECT id,status,stripe_checkout_session_id,stripe_payment_intent_id,stripe_customer_id
    FROM orders WHERE id=? LIMIT 1`).bind(orderId).first<{
      id: string;
      status: string;
      stripe_checkout_session_id: string | null;
      stripe_payment_intent_id: string | null;
      stripe_customer_id: string | null;
    }>();
  if (!local) return Response.json({ error: 'order_not_found', message: 'The Professional Training order could not be found.' }, { status: 404 });

  if (['paid','provisioning','fulfilled','partially_refunded','refunded'].includes(local.status)) {
    return Response.json({ orderId, status: local.status, paid: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const status = await centralStatus(env, orderId);
    const checkout = (status.checkoutRequests ?? []).find((row) => row.order_reference === orderId) ?? status.checkoutRequests?.[0];
    const transactions = (status.transactions ?? []).filter((row) => row.order_reference === orderId);
    const completed = checkout?.status === 'completed' || transactions.some((row) => row.event_type === 'checkout.session.completed' || row.event_type === 'checkout.session.async_payment_succeeded');
    const failed = checkout?.status === 'failed' || transactions.some((row) => row.event_type === 'checkout.session.async_payment_failed' || row.event_type === 'payment_intent.payment_failed');
    const expired = checkout?.status === 'expired' || transactions.some((row) => row.event_type === 'checkout.session.expired');

    if (completed) {
      const transaction = transactions.find((row) => row.stripe_payment_intent_id) ?? transactions[0];
      await markProfessionalTrainingOrderPaid(env.DB, orderId, {
        checkoutSessionId: checkout?.stripe_checkout_session_id || local.stripe_checkout_session_id,
        paymentIntentId: transaction?.stripe_payment_intent_id || local.stripe_payment_intent_id,
        stripeCustomerId: checkout?.stripe_customer_id || transaction?.stripe_customer_id || local.stripe_customer_id,
      });
      return Response.json({ orderId, status: 'paid', paid: true, centralStatus: checkout?.status ?? 'completed' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (failed || expired) {
      const next = expired ? 'cancelled' : 'failed';
      await markProfessionalTrainingOrderFailed(env.DB, orderId, next);
      await deletePendingLearnerFiles(env, orderId);
      return Response.json({ orderId, status: next, paid: false, centralStatus: checkout?.status ?? next }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({ orderId, status: 'awaiting_payment', paid: false, centralStatus: checkout?.status ?? 'created' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: 'central_payment_status_failed', message: error instanceof Error ? error.message : 'Central Payments status could not be read.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};
