import {
  currentSubscription,
  planDefinition,
  recordLmsAudit,
  requireProductionLms,
  stableId,
  subscriptionHasAccess,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

const EXPECTED_STRIPE_ACCOUNT_ID = 'acct_1TfUSWDLIZgCwhkL';
const TERMS_VERSION = 'learning-library-subscription-v1.0-2026-08-06';

type CheckoutInput = {
  planId?: string;
  termsAccepted?: boolean;
  immediateAccessRequested?: boolean;
  termsVersion?: string;
};

type StripeAccount = {
  id: string;
  charges_enabled?: boolean;
};

type StripeCustomer = {
  id: string;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

class StripeCheckoutError extends Error {
  status: number;
  code: string | null;
  parameter: string | null;

  constructor(message: string, status: number, code: string | null, parameter: string | null) {
    super(message);
    this.name = 'StripeCheckoutError';
    this.status = status;
    this.code = code;
    this.parameter = parameter;
  }
}

function stripeForm(values: Record<string, string | number | boolean | null | undefined>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    form.set(key, String(value));
  }
  return form;
}

function stripeErrorFromBody(body: Record<string, unknown>, status: number) {
  const error = body.error && typeof body.error === 'object'
    ? body.error as Record<string, unknown>
    : null;
  return new StripeCheckoutError(
    typeof error?.message === 'string' ? error.message : 'Stripe rejected the checkout request.',
    status,
    typeof error?.code === 'string' ? error.code : null,
    typeof error?.param === 'string' ? error.param : null,
  );
}

async function stripeGet<T>(env: ProductionLmsEnv, path: string): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new StripeCheckoutError('Stripe is not connected.', 503, 'missing_key', null);
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const body = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) throw stripeErrorFromBody(body, response.status);
  return body as T;
}

async function stripePost<T>(
  env: ProductionLmsEnv,
  path: string,
  values: Record<string, string | number | boolean | null | undefined>,
  idempotencyKey: string,
): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new StripeCheckoutError('Stripe is not connected.', 503, 'missing_key', null);
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body: stripeForm(values),
  });
  const body = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) throw stripeErrorFromBody(body, response.status);
  return body as T;
}

function publicStripeMessage(error: unknown) {
  if (!(error instanceof StripeCheckoutError)) {
    return 'Stripe Checkout could not be started. Please try again or contact Sousa Murray eLearning.';
  }

  if (error.code === 'api_key_expired' || error.status === 401) {
    return 'The Stripe connection in Cloudflare is invalid or expired. Replace STRIPE_SECRET_KEY with the current live key for the JA Group Services Ltd principal Stripe account.';
  }
  if (error.code === 'resource_missing' && error.parameter?.includes('price')) {
    return 'The configured Stripe key cannot access this Learning Library price. The Cloudflare Stripe key and the four LMS prices must belong to the same JA Group Services Ltd Stripe account.';
  }
  if (error.code === 'resource_missing' && error.parameter?.includes('customer')) {
    return 'The saved Stripe customer record was unavailable. Please try again so the LMS can create a fresh billing record.';
  }
  if (/terms of service url/i.test(error.message)) {
    return 'Stripe Public details are missing a terms-of-service URL. The LMS now collects the required agreement before redirecting, so refresh the page and try again after deployment.';
  }
  return error.message;
}

async function ensureStripeCustomer(
  env: ProductionLmsEnv,
  db: D1Database,
  profile: {
    account_id: string;
    entra_tenant_id: string;
    entra_object_id: string;
    head_office_customer_number: string;
    stripe_customer_id: string | null;
  },
  session: { accountId: string; email: string; name: string },
) {
  if (profile.stripe_customer_id) {
    try {
      return await stripeGet<StripeCustomer>(env, `/customers/${encodeURIComponent(profile.stripe_customer_id)}`);
    } catch (error) {
      if (!(error instanceof StripeCheckoutError) || error.status !== 404) throw error;
      await db.prepare(`
        UPDATE lms_identity_profiles
        SET stripe_customer_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `).bind(session.accountId).run();
    }
  }

  const customer = await stripePost<StripeCustomer>(env, '/customers', {
    email: session.email,
    name: session.name,
    'metadata[ja_account_id]': session.accountId,
    'metadata[head_office_customer_number]': profile.head_office_customer_number,
    'metadata[entra_tenant_id]': profile.entra_tenant_id,
    'metadata[entra_object_id]': profile.entra_object_id,
    'metadata[division]': 'sousa_murray_elearning',
    'metadata[service]': 'learning_library',
  }, `lms-customer-${session.accountId}`);

  await db.prepare(`
    UPDATE lms_identity_profiles
    SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
  `).bind(customer.id, session.accountId).run();
  return customer;
}

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  if (env.LMS_SALES_ENABLED === 'false') {
    return Response.json({
      error: 'lms_sales_disabled',
      message: 'Learning Library subscription checkout is temporarily unavailable.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({
      error: 'stripe_not_connected',
      message: 'Stripe is not connected to the production LMS.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  let input: CheckoutInput;
  try {
    input = await request.json<CheckoutInput>();
  } catch {
    return Response.json({ error: 'invalid_request', message: 'A valid subscription checkout request is required.' }, { status: 400 });
  }

  const plan = planDefinition(input.planId);
  if (!plan) {
    return Response.json({ error: 'invalid_plan', message: 'Choose a valid Sousa Murray Learning Library plan.' }, { status: 400 });
  }
  if (input.termsAccepted !== true || input.immediateAccessRequested !== true || input.termsVersion !== TERMS_VERSION) {
    return Response.json({
      error: 'subscription_consent_required',
      message: 'Accept the Learning Library Subscription Terms and request immediate digital access before continuing to Stripe Checkout.',
    }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const existing = await currentSubscription(env.DB, access.session.accountId);
  if (subscriptionHasAccess(existing)) {
    return Response.json({
      error: 'subscription_already_active',
      message: 'This account already has an active Learning Library subscription. Use Manage billing to change it.',
    }, { status: 409 });
  }

  try {
    const stripeAccount = await stripeGet<StripeAccount>(env, '/account');
    if (stripeAccount.id !== EXPECTED_STRIPE_ACCOUNT_ID) {
      return Response.json({
        error: 'wrong_stripe_account',
        message: 'Cloudflare is connected to the wrong Stripe account. STRIPE_SECRET_KEY must be the live key for the JA Group Services Ltd principal Stripe account used by Sousa Murray eLearning.',
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    if (stripeAccount.charges_enabled === false) {
      return Response.json({
        error: 'stripe_charges_disabled',
        message: 'The JA Group Services Ltd Stripe account is not currently enabled to accept charges.',
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    const customer = await ensureStripeCustomer(env, env.DB, access.profile, access.session);
    const checkoutId = await stableId('lms-checkout', `${access.session.accountId}:${plan.id}:${crypto.randomUUID()}`);
    const baseUrl = new URL(request.url).origin;

    const checkoutSession = await stripePost<StripeCheckoutSession>(env, '/checkout/sessions', {
      mode: 'subscription',
      customer: customer.id,
      client_reference_id: access.session.accountId,
      'line_items[0][price]': plan.stripePriceId,
      'line_items[0][quantity]': 1,
      success_url: `${baseUrl}/lms/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/plans?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      'customer_update[address]': 'auto',
      'custom_text[submit][message]': `${plan.name} renews monthly at £${(plan.amountPence / 100).toFixed(2)} including VAT until cancelled. Highfield Professional Training is not included.`,
      'metadata[lms_checkout_id]': checkoutId,
      'metadata[ja_account_id]': access.session.accountId,
      'metadata[head_office_customer_number]': access.profile.head_office_customer_number,
      'metadata[entra_tenant_id]': access.profile.entra_tenant_id,
      'metadata[entra_object_id]': access.profile.entra_object_id,
      'metadata[plan_id]': plan.id,
      'metadata[seat_limit]': plan.seatLimit,
      'metadata[terms_version]': TERMS_VERSION,
      'metadata[terms_accepted]': 'true',
      'metadata[immediate_access_requested]': 'true',
      'metadata[division]': 'sousa_murray_elearning',
      'metadata[service]': 'learning_library',
      'subscription_data[metadata][ja_account_id]': access.session.accountId,
      'subscription_data[metadata][head_office_customer_number]': access.profile.head_office_customer_number,
      'subscription_data[metadata][entra_tenant_id]': access.profile.entra_tenant_id,
      'subscription_data[metadata][entra_object_id]': access.profile.entra_object_id,
      'subscription_data[metadata][plan_id]': plan.id,
      'subscription_data[metadata][seat_limit]': plan.seatLimit,
      'subscription_data[metadata][terms_version]': TERMS_VERSION,
      'subscription_data[metadata][terms_accepted]': 'true',
      'subscription_data[metadata][immediate_access_requested]': 'true',
      'subscription_data[metadata][division]': 'sousa_murray_elearning',
      'subscription_data[metadata][service]': 'learning_library',
    }, `lms-checkout-${checkoutId}`);

    if (!checkoutSession.url) {
      throw new StripeCheckoutError('Stripe did not return a Checkout URL.', 502, 'missing_checkout_url', null);
    }

    await env.DB.prepare(`
      INSERT INTO lms_checkout_sessions (
        id, account_id, plan_id, stripe_checkout_session_id, status
      ) VALUES (?, ?, ?, ?, 'created')
    `).bind(checkoutId, access.session.accountId, plan.id, checkoutSession.id).run();

    await recordLmsAudit(
      env.DB,
      request,
      access.session.accountId,
      'subscription_checkout_created',
      'lms_checkout_session',
      checkoutId,
      {
        planId: plan.id,
        stripeCheckoutSessionId: checkoutSession.id,
        stripeAccountId: stripeAccount.id,
        termsVersion: TERMS_VERSION,
        termsAccepted: true,
        immediateAccessRequested: true,
      },
    );

    return Response.json({ url: checkoutSession.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = publicStripeMessage(error);
    await recordLmsAudit(
      env.DB,
      request,
      access.session.accountId,
      'subscription_checkout_failed',
      'lms_checkout',
      null,
      {
        planId: plan.id,
        reason: error instanceof Error ? error.message : 'Unknown checkout error',
        stripeCode: error instanceof StripeCheckoutError ? error.code : null,
        stripeParameter: error instanceof StripeCheckoutError ? error.parameter : null,
      },
    ).catch(() => undefined);

    return Response.json({
      error: 'stripe_checkout_failed',
      message,
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};
