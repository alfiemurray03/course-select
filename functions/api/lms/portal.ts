import {
  currentSubscription,
  productionSiteUrl,
  recordLmsAudit,
  requireProductionLms,
  stripeRequest,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type PortalSession = {
  id: string;
  url: string;
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;
  if (!access.profile.stripe_customer_id) {
    return Response.json({
      error: 'stripe_customer_missing',
      message: 'This account does not yet have a Stripe billing profile.',
    }, { status: 404 });
  }

  const subscription = await currentSubscription(env.DB, access.session.accountId);
  if (!subscription) {
    return Response.json({
      error: 'subscription_missing',
      message: 'No Learning Library subscription is available to manage.',
    }, { status: 404 });
  }

  const baseUrl = productionSiteUrl(request, env);
  const portal = await stripeRequest<PortalSession>(env, '/billing_portal/sessions', {
    customer: access.profile.stripe_customer_id,
    return_url: `${baseUrl}/lms/dashboard`,
  });

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    'billing_portal_opened',
    'lms_subscription',
    subscription.id,
    { stripePortalSessionId: portal.id },
  );

  return Response.json({ url: portal.url }, { headers: { 'Cache-Control': 'no-store' } });
};
