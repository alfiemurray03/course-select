import {
  LMS_PLANS,
  currentSubscription,
  productionSiteUrl,
  recordLmsAudit,
  requireProductionLms,
  stripeRequest,
  stripeRetrieve,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type PortalSession = {
  id: string;
  url: string;
};

type PortalConfiguration = {
  id: string;
  active: boolean;
  metadata?: Record<string, string>;
};

type PortalConfigurationList = {
  data: PortalConfiguration[];
};

async function ensureLearningLibraryPortalConfiguration(
  env: ProductionLmsEnv,
  baseUrl: string,
) {
  const configurations = await stripeRetrieve<PortalConfigurationList>(
    env,
    '/billing_portal/configurations?active=true&limit=100',
  );
  const existing = configurations.data.find((configuration) => (
    configuration.metadata?.division === 'sousa_murray_elearning'
    && configuration.metadata?.service === 'learning_library'
    && configuration.metadata?.configuration_version === '1'
  ));
  if (existing) return existing.id;

  const values: Record<string, string | number | boolean> = {
    'business_profile[headline]': 'Manage your Sousa Murray Learning Library subscription',
    'business_profile[privacy_policy_url]': `${baseUrl}/privacy`,
    'business_profile[terms_of_service_url]': `${baseUrl}/learning-library-subscription-terms.html`,
    default_return_url: `${baseUrl}/lms/dashboard`,
    'features[customer_update][enabled]': true,
    'features[customer_update][allowed_updates][0]': 'name',
    'features[customer_update][allowed_updates][1]': 'email',
    'features[customer_update][allowed_updates][2]': 'address',
    'features[customer_update][allowed_updates][3]': 'phone',
    'features[invoice_history][enabled]': true,
    'features[payment_method_update][enabled]': true,
    'features[subscription_cancel][enabled]': true,
    'features[subscription_cancel][mode]': 'at_period_end',
    'features[subscription_cancel][proration_behavior]': 'none',
    'features[subscription_cancel][cancellation_reason][enabled]': true,
    'features[subscription_cancel][cancellation_reason][options][0]': 'too_expensive',
    'features[subscription_cancel][cancellation_reason][options][1]': 'missing_features',
    'features[subscription_cancel][cancellation_reason][options][2]': 'switched_service',
    'features[subscription_cancel][cancellation_reason][options][3]': 'unused',
    'features[subscription_cancel][cancellation_reason][options][4]': 'customer_service',
    'features[subscription_cancel][cancellation_reason][options][5]': 'too_complex',
    'features[subscription_cancel][cancellation_reason][options][6]': 'low_quality',
    'features[subscription_cancel][cancellation_reason][options][7]': 'other',
    'features[subscription_update][enabled]': true,
    'features[subscription_update][default_allowed_updates][0]': 'price',
    'features[subscription_update][proration_behavior]': 'create_prorations',
    'features[subscription_update][billing_cycle_anchor]': 'unchanged',
    'login_page[enabled]': false,
    'metadata[legal_operator]': 'JA Group Services Ltd',
    'metadata[division]': 'sousa_murray_elearning',
    'metadata[service]': 'learning_library',
    'metadata[configuration_version]': '1',
  };

  LMS_PLANS.forEach((plan, index) => {
    values[`features[subscription_update][products][${index}][product]`] = plan.stripeProductId;
    values[`features[subscription_update][products][${index}][prices][0]`] = plan.stripePriceId;
  });

  const created = await stripeRequest<PortalConfiguration>(
    env,
    '/billing_portal/configurations',
    values,
    'sousa-murray-elearning-portal-configuration-v1',
  );
  return created.id;
}

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
  const configurationId = await ensureLearningLibraryPortalConfiguration(env, baseUrl);
  const portal = await stripeRequest<PortalSession>(env, '/billing_portal/sessions', {
    customer: access.profile.stripe_customer_id,
    configuration: configurationId,
    return_url: `${baseUrl}/lms/dashboard`,
  });

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    'billing_portal_opened',
    'lms_subscription',
    subscription.id,
    {
      stripePortalSessionId: portal.id,
      stripePortalConfigurationId: configurationId,
    },
  );

  return Response.json({ url: portal.url }, { headers: { 'Cache-Control': 'no-store' } });
};
