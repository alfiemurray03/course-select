import type { CustomerSession } from './customer-auth';
import {
  planDefinition,
  stableId,
  type IdentityProfile,
  type LmsPlanDefinition,
  type LmsPlanId,
  type ProductionLmsEnv,
} from './production-lms';

export type CentralPaymentsEnv = ProductionLmsEnv & {
  CUSTOMEROPS_BASE_URL?: string;
  CUSTOMEROPS_API_KEY?: string;
  HEAD_OFFICE_API_BASE_URL?: string;
  HEAD_OFFICE_PLATFORM_KEY?: string;
};

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';
const BRAND = 'SOUSA_MURRAY_ELEARNING';

export const FREE_TRIAL_COURSE_SLUG = 'digital-skills-and-ai-at-work';
export const FREE_TRIAL_PRODUCT_CODE = 'ELEARNING_AI_LITERACY_TRIAL';
export const FREE_TRIAL_PRICE_CODE = 'ELEARNING_AI_LITERACY_TRIAL_FREE';
export const FREE_TRIAL_DURATION_DAYS = 7;

const CENTRAL_PLAN_CODES: Record<LmsPlanId, { productCode: string; priceCode: string }> = {
  learner: { productCode: 'ELEARNING_LEARNER', priceCode: 'ELEARNING_LEARNER_MONTHLY' },
  'learner-plus': { productCode: 'ELEARNING_LEARNER_PLUS', priceCode: 'ELEARNING_LEARNER_PLUS_MONTHLY' },
  'team-5': { productCode: 'ELEARNING_TEAM_5', priceCode: 'ELEARNING_TEAM_5_MONTHLY' },
  'team-15': { productCode: 'ELEARNING_TEAM_15', priceCode: 'ELEARNING_TEAM_15_MONTHLY' },
};

const PRICE_TO_PLAN = Object.fromEntries(
  Object.entries(CENTRAL_PLAN_CODES).map(([planId, codes]) => [codes.priceCode, planId]),
) as Record<string, LmsPlanId>;

function connector(env: CentralPaymentsEnv) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  return { token, base };
}

export function centralPaymentsConfigured(env: CentralPaymentsEnv) {
  return connector(env).token.length > 20;
}

async function headOffice<T>(env: CentralPaymentsEnv, path: string, init: RequestInit = {}): Promise<T> {
  const { token, base } = connector(env);
  if (!token) throw new Error('The Head Office platform connector is not configured for Sousa Murray eLearning.');
  const target = new URL(path, `${base}/`);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error('The Head Office platform connector must use HTTPS.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(target.toString(), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = await response.json<Record<string, unknown>>().catch(() => ({}));
    if (!response.ok) {
      const detail = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : null;
      const message = typeof detail?.message === 'string'
        ? detail.message
        : `Head Office Central Payments returned HTTP ${response.status}.`;
      const error = new Error(message) as Error & { status?: number; code?: string };
      error.status = response.status;
      error.code = typeof detail?.code === 'string' ? detail.code : 'central_payments_request_failed';
      throw error;
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

function validUcn(value: string | null | undefined) {
  return /^\d{10}$/.test(String(value || '').replace(/\s/g, ''));
}

export async function synchroniseElearningCustomer(
  env: CentralPaymentsEnv,
  db: D1Database,
  session: CustomerSession,
  profile: IdentityProfile,
) {
  if (!centralPaymentsConfigured(env)) return profile;
  const response = await headOffice<{
    customer?: { id?: string; customerNumber?: string };
  }>(env, '/api/platform/customers/upsert', {
    method: 'POST',
    body: JSON.stringify({
      entraTenantId: profile.entra_tenant_id,
      entraObjectId: profile.entra_object_id,
      platformCustomerId: session.accountId,
      displayName: session.name || session.email,
      email: session.email,
      accountEnabled: true,
      accountStatus: 'active',
      lastActivityAt: new Date().toISOString(),
      secureRecordUrl: 'https://sousamurrayelearning.jagroupservices.co.uk/lms/dashboard',
      platformMetadata: { service: 'learning_library' },
    }),
  });
  const centralUcn = String(response.customer?.customerNumber || '').replace(/\s/g, '');
  if (!validUcn(centralUcn)) throw new Error('Head Office did not return a valid JA Group Services UCN for this learner.');
  if (centralUcn !== profile.head_office_customer_number) {
    await db.prepare(`UPDATE lms_identity_profiles
      SET head_office_customer_number=?, updated_at=CURRENT_TIMESTAMP WHERE account_id=?`)
      .bind(centralUcn, profile.account_id).run();
  }
  return { ...profile, head_office_customer_number: centralUcn };
}

export async function createCentralLmsCheckout(
  env: CentralPaymentsEnv,
  profile: IdentityProfile,
  session: CustomerSession,
  plan: LmsPlanDefinition,
  baseUrl: string,
  metadata: { termsVersion: string; termsAccepted: boolean; immediateAccessRequested: boolean },
) {
  const codes = CENTRAL_PLAN_CODES[plan.id];
  const response = await headOffice<{
    checkout?: { reference?: string; sessionId?: string; url?: string };
  }>(env, '/api/v1/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({
      brand: BRAND,
      customerNumber: profile.head_office_customer_number,
      productCode: codes.productCode,
      priceCode: codes.priceCode,
      orderReference: `ELEARNING-${plan.id.toUpperCase()}-${crypto.randomUUID()}`,
      serviceReference: `${session.accountId}:${plan.id}:${metadata.termsVersion}`,
      successUrl: `${baseUrl}/lms/checkout/success?central_payment=success`,
      cancelUrl: `${baseUrl}/plans?checkout=cancelled`,
    }),
  });
  if (!response.checkout?.url || !response.checkout.sessionId || !response.checkout.reference) {
    throw new Error('Head Office did not return a complete Central Payments checkout response.');
  }
  return response.checkout;
}

type CentralSubscription = {
  stripe_subscription_id: string;
  stripe_customer_id: string;
  price_code: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number | boolean;
  cancelled_at: string | null;
  stripe_checkout_session_id?: string | null;
};

export type CentralCheckoutRequest = {
  id: string;
  product_code: string;
  price_code: string;
  customer_number: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  service_reference: string | null;
  mode: string;
  status: string;
  amount_minor: number;
  currency: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function lmsStatus(value: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'canceled') return 'cancelled';
  if (['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'paused'].includes(status)) return status;
  return 'incomplete';
}

async function ensureTeamOrganisation(db: D1Database, accountId: string, subscriptionId: string, plan: LmsPlanDefinition) {
  if (plan.seatLimit <= 1) return;
  const account = await db.prepare('SELECT display_name, organisation_name FROM customer_accounts WHERE id=?')
    .bind(accountId).first<{ display_name: string | null; organisation_name: string | null }>();
  const organisationId = await stableId('lms-organisation', subscriptionId);
  const memberId = await stableId('lms-member', `${organisationId}:${accountId}`);
  const name = account?.organisation_name || account?.display_name || 'Learning organisation';
  await db.batch([
    db.prepare(`INSERT INTO lms_organisations (id,owner_account_id,subscription_id,name,status)
      VALUES (?,?,?,?,'active') ON CONFLICT(subscription_id) DO UPDATE SET status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(organisationId, accountId, subscriptionId, name),
    db.prepare(`INSERT INTO lms_organisation_members (id,organisation_id,account_id,role,status,joined_at)
      VALUES (?,?,?,'owner','active',CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(memberId, organisationId, accountId),
  ]);
}

export async function syncCentralLmsSubscription(
  env: CentralPaymentsEnv,
  db: D1Database,
  session: CustomerSession,
  profile: IdentityProfile,
) {
  if (!centralPaymentsConfigured(env) || !validUcn(profile.head_office_customer_number)) return null;
  const response = await headOffice<{ subscriptions?: CentralSubscription[] }>(
    env,
    `/api/v1/payments/status?customerNumber=${encodeURIComponent(profile.head_office_customer_number)}`,
  );
  const subscriptions = response.subscriptions ?? [];
  const rank = (status: string) => {
    const order = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused', 'cancelled', 'canceled'];
    const value = order.indexOf(String(status || '').toLowerCase());
    return value < 0 ? 999 : value;
  };
  const current = [...subscriptions].sort((a, b) => rank(a.status) - rank(b.status))[0];
  if (!current?.stripe_subscription_id || !current.stripe_customer_id) return null;
  const planId = PRICE_TO_PLAN[String(current.price_code || '').toUpperCase()];
  const plan = planDefinition(planId);
  if (!plan) return null;
  const subscriptionId = await stableId('lms-subscription', current.stripe_subscription_id);
  const status = lmsStatus(current.status);
  const graceExpiresAt = status === 'past_due'
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await db.prepare(`INSERT INTO lms_subscriptions (
      id,account_id,plan_id,stripe_customer_id,stripe_subscription_id,stripe_checkout_session_id,
      status,seat_limit,current_period_start,current_period_end,cancel_at_period_end,cancelled_at,grace_expires_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(stripe_subscription_id) DO UPDATE SET account_id=excluded.account_id,plan_id=excluded.plan_id,
      stripe_customer_id=excluded.stripe_customer_id,status=excluded.status,seat_limit=excluded.seat_limit,
      current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
      cancel_at_period_end=excluded.cancel_at_period_end,cancelled_at=excluded.cancelled_at,
      grace_expires_at=CASE WHEN excluded.status IN ('active','trialing') THEN NULL ELSE COALESCE(lms_subscriptions.grace_expires_at,excluded.grace_expires_at) END,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(
      subscriptionId,
      session.accountId,
      plan.id,
      current.stripe_customer_id,
      current.stripe_subscription_id,
      current.stripe_checkout_session_id || null,
      status,
      plan.seatLimit,
      current.current_period_start || null,
      current.current_period_end || null,
      current.cancel_at_period_end ? 1 : 0,
      current.cancelled_at || null,
      graceExpiresAt,
    ).run();
  await db.prepare(`UPDATE lms_identity_profiles SET stripe_customer_id=?,updated_at=CURRENT_TIMESTAMP WHERE account_id=?`)
    .bind(current.stripe_customer_id, session.accountId).run();
  await ensureTeamOrganisation(db, session.accountId, subscriptionId, plan);
  return { subscriptionId, planId: plan.id, status, stripeCustomerId: current.stripe_customer_id };
}

export async function centralCourseTrialCheckout(
  env: CentralPaymentsEnv,
  profile: IdentityProfile,
) {
  const response = await headOffice<{ checkoutRequests?: CentralCheckoutRequest[] }>(
    env,
    `/api/v1/payments/status?customerNumber=${encodeURIComponent(profile.head_office_customer_number)}`,
  );
  return (response.checkoutRequests ?? []).find((checkout) => (
    String(checkout.product_code || '').toUpperCase() === FREE_TRIAL_PRODUCT_CODE
    && String(checkout.price_code || '').toUpperCase() === FREE_TRIAL_PRICE_CODE
    && String(checkout.status || '').toLowerCase() === 'completed'
  )) ?? null;
}

export async function createCentralCourseTrialCheckout(
  env: CentralPaymentsEnv,
  profile: IdentityProfile,
  session: CustomerSession,
  baseUrl: string,
) {
  const response = await headOffice<{
    checkout?: { reference?: string; sessionId?: string; url?: string; amountMinor?: number; currency?: string };
  }>(env, '/api/v1/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({
      brand: BRAND,
      customerNumber: profile.head_office_customer_number,
      productCode: FREE_TRIAL_PRODUCT_CODE,
      priceCode: FREE_TRIAL_PRICE_CODE,
      orderReference: `ELEARNING-AI-LITERACY-TRIAL-${crypto.randomUUID()}`,
      serviceReference: `${session.accountId}:${FREE_TRIAL_COURSE_SLUG}:7-day-trial`,
      successUrl: `${baseUrl}/lms/course/${FREE_TRIAL_COURSE_SLUG}?trial=success`,
      cancelUrl: `${baseUrl}/lms/course/${FREE_TRIAL_COURSE_SLUG}?trial=cancelled`,
    }),
  });
  if (!response.checkout?.url || !response.checkout.sessionId || !response.checkout.reference) {
    throw new Error('Head Office did not return a complete free-trial checkout response.');
  }
  if (Number(response.checkout.amountMinor ?? 0) !== 0) {
    throw new Error('The free course trial is not configured as a £0.00 Central Payments price.');
  }
  return response.checkout;
}
