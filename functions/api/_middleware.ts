import {
  ageCookieName,
  readCookie,
  verifyValue,
  type CustomerAuthEnv,
} from '../_shared/customer-auth';

type AgeConfirmation = {
  isAdult?: boolean;
  confirmedAt?: number;
};

type CheckoutConsentPayload = {
  digitalContentConsent?: boolean;
  digitalContentConsentRecordedAt?: string;
};

async function checkoutConsent(request: Request): Promise<CheckoutConsentPayload | null> {
  try {
    const contentType = request.headers.get('Content-Type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.clone().formData();
      const raw = form.get('payload');
      return typeof raw === 'string' ? JSON.parse(raw) as CheckoutConsentPayload : null;
    }
    if (contentType.includes('application/json')) {
      return await request.clone().json<CheckoutConsentPayload>();
    }
  } catch {
    return null;
  }
  return null;
}

export const onRequest: PagesFunction<CustomerAuthEnv> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const isCheckout = request.method === 'POST' && url.pathname === '/api/checkout';
  if (!isCheckout) return next();

  if (!env.SESSION_SECRET) {
    return Response.json({
      error: 'age_confirmation_not_configured',
      message: 'Aptenvo cannot start checkout until the 18+ confirmation service is configured.',
    }, { status: 503 });
  }

  const confirmation = await verifyValue<AgeConfirmation>(
    readCookie(request, ageCookieName()),
    env.SESSION_SECRET,
  );

  if (!confirmation?.isAdult || !confirmation.confirmedAt) {
    return Response.json({
      error: 'adult_confirmation_required',
      message: 'Aptenvo is an 18+ service. Confirm that you are aged 18 or over before proceeding to payment.',
    }, { status: 403 });
  }

  const consent = await checkoutConsent(request);
  const recordedAt = consent?.digitalContentConsentRecordedAt
    ? Date.parse(consent.digitalContentConsentRecordedAt)
    : Number.NaN;
  const recentConsent = Number.isFinite(recordedAt) && Math.abs(Date.now() - recordedAt) <= 15 * 60 * 1000;

  if (consent?.digitalContentConsent !== true || !recentConsent) {
    return Response.json({
      error: 'digital_supply_consent_required',
      message: 'Confirm immediate digital supply and acknowledge the cancellation position before proceeding to payment.',
    }, { status: 400 });
  }

  if (env.DB) {
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        id, action, entity_type, ip_address, user_agent, metadata_json
      ) VALUES (?, 'digital_supply_consent.accepted', 'checkout_intent', ?, ?, ?)
    `).bind(
      `audit-${crypto.randomUUID()}`,
      request.headers.get('CF-Connecting-IP'),
      request.headers.get('User-Agent'),
      JSON.stringify({
        confirmedAdultAt: confirmation.confirmedAt,
        digitalContentConsentRecordedAt: consent.digitalContentConsentRecordedAt,
        changeOfMindCancellationAcknowledged: true,
        statutoryRightsPreserved: true,
      }),
    ).run().catch(() => undefined);
  }

  return next();
};
