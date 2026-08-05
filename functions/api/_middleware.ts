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
  adultConfirmed?: boolean;
  adultConfirmedAt?: string;
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

function recentIso(value?: string, maximumAge = 15 * 60 * 1000) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) <= maximumAge;
}

export const onRequest: PagesFunction<CustomerAuthEnv> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const isCheckout = request.method === 'POST' && url.pathname === '/api/checkout';
  if (!isCheckout) return next();

  const consent = await checkoutConsent(request);
  let adultConfirmationTime: number | string | undefined;

  if (env.SESSION_SECRET) {
    const confirmation = await verifyValue<AgeConfirmation>(
      readCookie(request, ageCookieName()),
      env.SESSION_SECRET,
    );
    if (!confirmation?.isAdult || !confirmation.confirmedAt) {
      return Response.json({
        error: 'adult_confirmation_required',
        message: 'Sousa Murray eLearning is an 18+ service. Confirm that you are aged 18 or over before proceeding to payment.',
      }, { status: 403 });
    }
    adultConfirmationTime = confirmation.confirmedAt;
  } else {
    const recentAdultDeclaration = consent?.adultConfirmed === true
      && recentIso(consent.adultConfirmedAt, 365 * 24 * 60 * 60 * 1000);
    if (!recentAdultDeclaration) {
      return Response.json({
        error: 'adult_confirmation_required',
        message: 'Sousa Murray eLearning is an 18+ service. Confirm that you are aged 18 or over before proceeding to payment.',
      }, { status: 403 });
    }
    adultConfirmationTime = consent?.adultConfirmedAt;
  }

  if (consent?.digitalContentConsent !== true || !recentIso(consent.digitalContentConsentRecordedAt)) {
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
        confirmedAdultAt: adultConfirmationTime,
        confirmationProtection: env.SESSION_SECRET ? 'signed_cookie' : 'checkout_declaration',
        digitalContentConsentRecordedAt: consent.digitalContentConsentRecordedAt,
        changeOfMindCancellationAcknowledged: true,
        statutoryRightsPreserved: true,
      }),
    ).run().catch(() => undefined);
  }

  return next();
};
