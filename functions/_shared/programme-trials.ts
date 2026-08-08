import type { CustomerSession } from './customer-auth';
import type { CentralCheckoutRequest, CentralPaymentsEnv } from './central-payments';
import { courseEntitlement } from './course-entitlements';
import { stableId, type IdentityProfile } from './production-lms';
import {
  freeTrialOfferForSlug,
  type FreeTrialOffer,
} from '../../src/freeTrialOffers';
import type { LibraryCourse } from '../../src/libraryCatalogue';

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';
const BRAND = 'SOUSA_MURRAY_ELEARNING';

function connector(env: CentralPaymentsEnv) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  return { token, base };
}

function validUcn(value: string | null | undefined) {
  return /^\d{10}$/.test(String(value || '').replace(/\s/g, ''));
}

async function headOffice<T>(env: CentralPaymentsEnv, path: string, init: RequestInit = {}): Promise<T> {
  const { token, base } = connector(env);
  if (!token) throw Object.assign(new Error('The Head Office platform connector is not configured for Sousa Murray eLearning.'), { status: 503 });
  const target = new URL(path, `${base}/`);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw Object.assign(new Error('The Head Office platform connector must use HTTPS.'), { status: 503 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
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
      throw Object.assign(new Error(message), { status: response.status });
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureProgrammeTrialCatalogue(env: CentralPaymentsEnv) {
  return headOffice<{
    synced?: number;
    createdProducts?: number;
    createdPrices?: number;
    updatedProducts?: number;
  }>(env, '/api/v1/payments/programme-trial-catalogue-sync', {
    method: 'POST',
    body: JSON.stringify({ brand: BRAND }),
  });
}

export async function createProgrammeTrialCheckout(
  env: CentralPaymentsEnv,
  profile: IdentityProfile,
  session: CustomerSession,
  baseUrl: string,
  courseSlug: string,
) {
  const offer = freeTrialOfferForSlug(courseSlug);
  if (!offer) throw Object.assign(new Error('This programme does not currently have a free trial offer.'), { status: 404 });
  if (!validUcn(profile.head_office_customer_number)) {
    throw Object.assign(new Error('A valid JA Group Services UCN is required before a free trial can be created.'), { status: 409 });
  }

  // Keeps the live Stripe Product/Price catalogue aligned before a customer is sent to Checkout.
  await ensureProgrammeTrialCatalogue(env);

  const orderKey = offer.courseSlug.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 32);
  const response = await headOffice<{
    checkout?: { reference?: string; sessionId?: string; url?: string; mode?: string };
  }>(env, '/api/v1/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({
      brand: BRAND,
      customerNumber: profile.head_office_customer_number,
      productCode: offer.productCode,
      priceCode: offer.priceCode,
      orderReference: `ELEARNING-TRIAL-${orderKey}-${crypto.randomUUID()}`,
      serviceReference: `${session.accountId}:${offer.courseSlug}:free-trial`,
      successUrl: `${baseUrl}/lms/course/${offer.courseSlug}?trial=success`,
      cancelUrl: `${baseUrl}/lms/course/${offer.courseSlug}?trial=cancelled`,
    }),
  });
  if (!response.checkout?.url || !response.checkout.sessionId || !response.checkout.reference) {
    throw Object.assign(new Error('Head Office did not return a complete Stripe Checkout response for the programme trial.'), { status: 502 });
  }
  return response.checkout;
}

export async function completedProgrammeTrialCheckout(
  env: CentralPaymentsEnv,
  profile: IdentityProfile,
  courseSlug: string,
) {
  const offer = freeTrialOfferForSlug(courseSlug);
  if (!offer || !validUcn(profile.head_office_customer_number)) return null;
  const response = await headOffice<{ checkoutRequests?: CentralCheckoutRequest[] }>(
    env,
    `/api/v1/payments/status?customerNumber=${encodeURIComponent(profile.head_office_customer_number)}`,
  );
  const expectedServiceSuffix = `:${offer.courseSlug}:free-trial`;
  return (response.checkoutRequests ?? []).find((checkout) =>
    String(checkout.product_code || '').toUpperCase() === offer.productCode
    && String(checkout.price_code || '').toUpperCase() === offer.priceCode
    && String(checkout.status || '').toLowerCase() === 'completed'
    && Number(checkout.amount_minor || 0) === 0
    && String(checkout.service_reference || '').endsWith(expectedServiceSuffix)
  ) ?? null;
}

function trialDates(checkout: CentralCheckoutRequest, offer: FreeTrialOffer) {
  const rawStart = checkout.completed_at || checkout.updated_at || checkout.created_at || new Date().toISOString();
  const parsed = Date.parse(rawStart);
  const start = Number.isFinite(parsed) ? new Date(parsed) : new Date();
  const expires = new Date(start.getTime() + offer.durationDays * 24 * 60 * 60 * 1000);
  return {
    startsAt: start.toISOString(),
    expiresAt: expires.toISOString(),
    status: expires.getTime() > Date.now() ? 'active' : 'expired',
  };
}

export async function recordProgrammeTrialEntitlement(
  db: D1Database,
  accountId: string,
  course: LibraryCourse,
  checkout: CentralCheckoutRequest,
) {
  const offer = freeTrialOfferForSlug(course.slug);
  if (!offer) throw new Error('The selected course is not an approved programme trial.');
  const expectedServiceSuffix = `:${offer.courseSlug}:free-trial`;
  if (
    String(checkout.product_code || '').toUpperCase() !== offer.productCode
    || String(checkout.price_code || '').toUpperCase() !== offer.priceCode
    || String(checkout.status || '').toLowerCase() !== 'completed'
    || Number(checkout.amount_minor || 0) !== 0
    || !String(checkout.service_reference || '').endsWith(expectedServiceSuffix)
  ) {
    throw new Error('The Central Payments record is not a completed free trial for this programme.');
  }

  const { startsAt, expiresAt, status } = trialDates(checkout, offer);
  const id = await stableId('lms-course-entitlement', `${accountId}:${course.slug}:free_trial`);
  await db.prepare(`
    INSERT INTO lms_course_entitlements (
      id,account_id,course_slug,course_code,course_version,source,status,
      product_code,price_code,central_payment_reference,stripe_customer_id,
      stripe_checkout_session_id,claimed_at,starts_at,expires_at
    ) VALUES (?,?,?,?,?,'free_trial',?,?,?,?,?,?,?,?,?)
    ON CONFLICT(account_id,course_slug,source) DO UPDATE SET
      course_code=excluded.course_code,
      course_version=excluded.course_version,
      status=CASE WHEN lms_course_entitlements.revoked_at IS NULL THEN excluded.status ELSE lms_course_entitlements.status END,
      product_code=excluded.product_code,
      price_code=excluded.price_code,
      central_payment_reference=excluded.central_payment_reference,
      stripe_customer_id=excluded.stripe_customer_id,
      stripe_checkout_session_id=excluded.stripe_checkout_session_id,
      claimed_at=MIN(lms_course_entitlements.claimed_at,excluded.claimed_at),
      starts_at=MIN(lms_course_entitlements.starts_at,excluded.starts_at),
      expires_at=MIN(lms_course_entitlements.expires_at,excluded.expires_at),
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    id,
    accountId,
    course.slug,
    course.code,
    course.version,
    status,
    offer.productCode,
    offer.priceCode,
    checkout.id,
    checkout.stripe_customer_id || null,
    checkout.stripe_checkout_session_id || null,
    startsAt,
    startsAt,
    expiresAt,
  ).run();

  return courseEntitlement(db, accountId, course.slug, course.version);
}
