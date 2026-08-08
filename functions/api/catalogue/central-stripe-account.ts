import type { CentralPaymentsEnv } from '../../_shared/central-payments';
import type { ProductionLmsEnv } from '../../_shared/production-lms';

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';

type Env = ProductionLmsEnv & CentralPaymentsEnv;

// This route exposes only non-secret Stripe account identity returned by Head
// Office. It is used to verify that the eLearning website and Central Payments
// are pointed at the same principal JA Group Services Ltd Stripe account.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  if (!token) {
    return Response.json({ error: 'head_office_not_connected' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${base}/api/v1/payments/account-info`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json<Record<string, unknown>>().catch(() => ({}));
    if (!response.ok) {
      return Response.json({
        error: 'head_office_account_check_failed',
        status: response.status,
        message: typeof (body.error as Record<string, unknown> | undefined)?.message === 'string'
          ? (body.error as Record<string, unknown>).message
          : 'Head Office could not verify the Central Payments Stripe account.',
      }, { status: response.status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
    }

    return Response.json({
      stripeAccountId: body.stripeAccountId ?? null,
      liveMode: body.liveMode ?? null,
      mode: body.mode ?? null,
      displayName: body.displayName ?? null,
      country: body.country ?? null,
      defaultCurrency: body.defaultCurrency ?? null,
    }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    return Response.json({
      error: 'head_office_account_check_failed',
      message: error instanceof Error ? error.message : 'Head Office account verification failed.',
    }, { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } finally {
    clearTimeout(timeout);
  }
};
