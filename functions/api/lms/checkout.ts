import {
  createCentralLmsCheckout,
  centralPaymentsConfigured,
  syncCentralLmsSubscription,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
import {
  currentSubscription,
  planDefinition,
  recordLmsAudit,
  requireProductionLms,
  subscriptionHasAccess,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

const TERMS_VERSION = 'learning-library-subscription-v1.0-2026-08-06';

type CheckoutInput = {
  planId?: string;
  termsAccepted?: boolean;
  immediateAccessRequested?: boolean;
  termsVersion?: string;
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  if (env.LMS_SALES_ENABLED === 'false') {
    return Response.json({
      error: 'lms_sales_disabled',
      message: 'Learning Library subscription checkout is temporarily unavailable.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;
  const centralEnv = env as CentralPaymentsEnv;
  if (!centralPaymentsConfigured(centralEnv)) {
    return Response.json({
      error: 'central_payments_not_connected',
      message: 'JA Group Services Central Payments is not connected to Sousa Murray eLearning.',
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
      message: 'Accept the Learning Library Subscription Terms and request immediate digital access before continuing to checkout.',
    }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const centralProfile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, access.profile);
    await syncCentralLmsSubscription(centralEnv, env.DB, access.session, centralProfile).catch(() => null);
    const existing = await currentSubscription(env.DB, access.session.accountId);
    if (subscriptionHasAccess(existing)) {
      return Response.json({
        error: 'subscription_already_active',
        message: 'This account already has an active Learning Library subscription. Use Manage billing to change it.',
      }, { status: 409 });
    }

    const baseUrl = new URL(request.url).origin;
    const checkout = await createCentralLmsCheckout(
      centralEnv,
      centralProfile,
      access.session,
      plan,
      baseUrl,
      {
        termsVersion: TERMS_VERSION,
        termsAccepted: true,
        immediateAccessRequested: true,
      },
    );

    await env.DB.prepare(`INSERT INTO lms_checkout_sessions (
        id,account_id,plan_id,stripe_checkout_session_id,status
      ) VALUES (?,?,?,?,'created')
      ON CONFLICT(id) DO UPDATE SET stripe_checkout_session_id=excluded.stripe_checkout_session_id,
        status='created',updated_at=CURRENT_TIMESTAMP`)
      .bind(checkout.reference, access.session.accountId, plan.id, checkout.sessionId).run();

    await recordLmsAudit(
      env.DB,
      request,
      access.session.accountId,
      'subscription_checkout_created',
      'lms_checkout_session',
      checkout.reference,
      {
        planId: plan.id,
        centralPayments: true,
        stripeCheckoutSessionId: checkout.sessionId,
        headOfficeCustomerNumber: centralProfile.head_office_customer_number,
        termsVersion: TERMS_VERSION,
        termsAccepted: true,
        immediateAccessRequested: true,
      },
    );

    return Response.json({ url: checkout.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Central Payments checkout could not be started.';
    await recordLmsAudit(
      env.DB,
      request,
      access.session.accountId,
      'subscription_checkout_failed',
      'lms_checkout',
      null,
      { planId: plan.id, centralPayments: true, reason: message },
    ).catch(() => undefined);
    return Response.json({
      error: 'central_payments_checkout_failed',
      message,
    }, { status: Number((error as { status?: number })?.status || 502), headers: { 'Cache-Control': 'no-store' } });
  }
};
