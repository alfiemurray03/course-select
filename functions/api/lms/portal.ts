import {
  centralPaymentsConfigured,
  createCentralLmsPortal,
  syncCentralLmsSubscription,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
import {
  currentSubscription,
  productionSiteUrl,
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;
  const centralEnv = env as CentralPaymentsEnv;
  if (!centralPaymentsConfigured(centralEnv)) {
    return Response.json({
      error: 'central_payments_not_connected',
      message: 'JA Group Services Central Payments is not connected to Sousa Murray eLearning.',
    }, { status: 503 });
  }

  try {
    const profile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, access.profile);
    await syncCentralLmsSubscription(centralEnv, env.DB, access.session, profile);
    const subscription = await currentSubscription(env.DB, access.session.accountId);
    if (!subscription) {
      return Response.json({
        error: 'subscription_missing',
        message: 'No Learning Library subscription is available to manage.',
      }, { status: 404 });
    }

    const baseUrl = productionSiteUrl(request, env);
    const portalUrl = await createCentralLmsPortal(centralEnv, profile, baseUrl);
    await recordLmsAudit(
      env.DB,
      request,
      access.session.accountId,
      'billing_portal_opened',
      'lms_subscription',
      subscription.id,
      { centralPayments: true, headOfficeCustomerNumber: profile.head_office_customer_number },
    );
    return Response.json({ url: portalUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      error: 'central_payments_portal_failed',
      message: error instanceof Error ? error.message : 'The Central Payments billing portal could not be opened.',
    }, { status: Number((error as { status?: number })?.status || 502), headers: { 'Cache-Control': 'no-store' } });
  }
};
