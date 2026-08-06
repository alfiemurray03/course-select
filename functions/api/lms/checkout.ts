import {
  currentSubscription,
  planDefinition,
  productionSiteUrl,
  recordLmsAudit,
  requireProductionLms,
  stableId,
  stripeRequest,
  subscriptionHasAccess,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type CheckoutInput = {
  planId?: string;
};

type StripeCustomer = {
  id: string;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({
      error: 'stripe_not_connected',
      message: 'Stripe is not connected to the production LMS.',
    }, { status: 503 });
  }

  let input: CheckoutInput;
  try {
    input = await request.json<CheckoutInput>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const plan = planDefinition(input.planId);
  if (!plan) {
    return Response.json({ error: 'invalid_plan', message: 'Choose a valid Sousa Murray Learning Library plan.' }, { status: 400 });
  }

  const existing = await currentSubscription(env.DB, access.session.accountId);
  if (subscriptionHasAccess(existing)) {
    return Response.json({
      error: 'subscription_already_active',
      message: 'This account already has an active Learning Library subscription. Use Manage billing to change it.',
    }, { status: 409 });
  }

  let stripeCustomerId = access.profile.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripeRequest<StripeCustomer>(env, '/customers', {
      email: access.session.email,
      name: access.session.name,
      'metadata[ja_account_id]': access.session.accountId,
      'metadata[head_office_customer_number]': access.profile.head_office_customer_number,
      'metadata[entra_tenant_id]': access.profile.entra_tenant_id,
      'metadata[entra_object_id]': access.profile.entra_object_id,
      'metadata[division]': 'sousa_murray_elearning',
      'metadata[service]': 'learning_library',
    }, `lms-customer-${access.session.accountId}`);
    stripeCustomerId = customer.id;
    await env.DB.prepare(`
      UPDATE lms_identity_profiles
      SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `).bind(stripeCustomerId, access.session.accountId).run();
  }

  const checkoutId = await stableId('lms-checkout', `${access.session.accountId}:${plan.id}:${crypto.randomUUID()}`);
  const baseUrl = productionSiteUrl(request, env);
  const session = await stripeRequest<StripeCheckoutSession>(env, '/checkout/sessions', {
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: access.session.accountId,
    'line_items[0][price]': plan.stripePriceId,
    'line_items[0][quantity]': 1,
    success_url: `${baseUrl}/lms/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/plans?checkout=cancelled`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    'customer_update[address]': 'auto',
    'metadata[lms_checkout_id]': checkoutId,
    'metadata[ja_account_id]': access.session.accountId,
    'metadata[head_office_customer_number]': access.profile.head_office_customer_number,
    'metadata[entra_tenant_id]': access.profile.entra_tenant_id,
    'metadata[entra_object_id]': access.profile.entra_object_id,
    'metadata[plan_id]': plan.id,
    'metadata[seat_limit]': plan.seatLimit,
    'metadata[division]': 'sousa_murray_elearning',
    'metadata[service]': 'learning_library',
    'subscription_data[metadata][ja_account_id]': access.session.accountId,
    'subscription_data[metadata][head_office_customer_number]': access.profile.head_office_customer_number,
    'subscription_data[metadata][entra_tenant_id]': access.profile.entra_tenant_id,
    'subscription_data[metadata][entra_object_id]': access.profile.entra_object_id,
    'subscription_data[metadata][plan_id]': plan.id,
    'subscription_data[metadata][seat_limit]': plan.seatLimit,
    'subscription_data[metadata][division]': 'sousa_murray_elearning',
    'subscription_data[metadata][service]': 'learning_library',
  }, `lms-checkout-${checkoutId}`);

  if (!session.url) throw new Error('Stripe did not return a Checkout URL.');

  await env.DB.prepare(`
    INSERT INTO lms_checkout_sessions (
      id, account_id, plan_id, stripe_checkout_session_id, status
    ) VALUES (?, ?, ?, ?, 'created')
  `).bind(checkoutId, access.session.accountId, plan.id, session.id).run();

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    'subscription_checkout_created',
    'lms_checkout_session',
    checkoutId,
    { planId: plan.id, stripeCheckoutSessionId: session.id },
  );

  return Response.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
};
