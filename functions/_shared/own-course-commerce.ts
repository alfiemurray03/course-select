import type { LibraryCourse } from '../../src/libraryCatalogue';
import type { CustomerSession } from './customer-auth';
import type { CentralCheckoutRequest, CentralPaymentsEnv } from './central-payments';
import type { IdentityProfile } from './production-lms';

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';
const BRAND = 'SOUSA_MURRAY_ELEARNING';
export const OWN_COURSE_PRODUCT_CODE = 'ELEARNING_OWN_COURSE_BASKET';
export const OWN_COURSE_PRICE_CODE = 'OWN_COURSE_BASKET';
export const UNIFIED_COURSE_PRODUCT_CODE = 'ELEARNING_UNIFIED_COURSE_BASKET';

export type OwnCoursePricingItem = {
  courseCode: string;
  configured: boolean;
  grossPence: number | null;
  netPence: number | null;
  vatPence: number | null;
  currency: string;
};

export type OwnCoursePricingResponse = {
  configured: boolean;
  accessDays: number | null;
  accessLabel: string | null;
  items: OwnCoursePricingItem[];
};

type CentralCheckoutItem = {
  checkout_request_id?: string;
  item_code?: string;
  line_gross_minor?: number;
  metadata_json?: string;
};

export type OwnCourseCheckoutStatus = CentralCheckoutRequest & {
  own_course_amount_minor?: number;
};

function connector(env: CentralPaymentsEnv) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  return { token, base };
}

async function requestHeadOffice<T>(env: CentralPaymentsEnv, path: string, init: RequestInit = {}): Promise<T> {
  const { token, base } = connector(env);
  if (!token) throw Object.assign(new Error('The Head Office Central Payments connection is not configured.'), { status: 503 });
  const target = new URL(path, `${base}/`);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw Object.assign(new Error('The Head Office Central Payments connection must use HTTPS.'), { status: 503 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
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
      const error = new Error(typeof detail?.message === 'string' ? detail.message : `Head Office Central Payments returned HTTP ${response.status}.`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ownCoursePricing(env: CentralPaymentsEnv, courses: readonly LibraryCourse[]) {
  if (!courses.length) return { configured: false, accessDays: null, accessLabel: null, items: [] } as OwnCoursePricingResponse;
  const codes = [...new Set(courses.map((course) => course.code))];
  return requestHeadOffice<OwnCoursePricingResponse>(env, `/api/v1/payments/learning-course-pricing?codes=${encodeURIComponent(codes.join(','))}`);
}

export async function createCentralOwnCourseBasketCheckout(
  env: CentralPaymentsEnv,
  profile: IdentityProfile,
  session: CustomerSession,
  courses: readonly LibraryCourse[],
  baseUrl: string,
  orderReference: string,
) {
  const response = await requestHeadOffice<{
    checkout?: { reference?: string; sessionId?: string; url?: string; amountMinor?: number; currency?: string };
    commerce?: { accessDays?: number | null; accessLabel?: string | null };
    totals?: { subtotalNetMinor?: number; vatMinor?: number; totalGrossMinor?: number; courseCount?: number };
  }>(env, '/api/v1/payments/learning-basket-checkout', {
    method: 'POST',
    body: JSON.stringify({
      brand: BRAND,
      customerNumber: profile.head_office_customer_number,
      orderReference,
      serviceReference: `${session.accountId}:own-course-purchase`,
      items: courses.map((course) => ({ courseCode: course.code, courseTitle: course.title })),
      successUrl: `${baseUrl}/learning-library/purchase/success?order=${encodeURIComponent(orderReference)}`,
      cancelUrl: `${baseUrl}/basket?checkout=cancelled`,
    }),
  });
  if (!response.checkout?.url || !response.checkout.sessionId || !response.checkout.reference) {
    throw Object.assign(new Error('Head Office did not return a complete Stripe Checkout response for the Sousa Murray course basket.'), { status: 502 });
  }
  return response;
}

function isOwnCourseLine(item: CentralCheckoutItem) {
  try {
    const metadata = item.metadata_json ? JSON.parse(item.metadata_json) as Record<string, unknown> : {};
    return String(metadata.family || '').toLowerCase() === 'sousa_murray'
      || String(metadata.provider || '').toLowerCase() === 'sousa murray elearning';
  } catch {
    return false;
  }
}

export async function centralOwnCourseCheckoutStatus(
  env: CentralPaymentsEnv,
  orderReference: string,
) {
  const response = await requestHeadOffice<{
    checkoutRequests?: CentralCheckoutRequest[];
    checkoutItems?: CentralCheckoutItem[];
  }>(
    env,
    `/api/v1/payments/status?orderReference=${encodeURIComponent(orderReference)}`,
  );
  const checkout = (response.checkoutRequests ?? []).find((row) => {
    const productCode = String(row.product_code || '').toUpperCase();
    return productCode === OWN_COURSE_PRODUCT_CODE || productCode === UNIFIED_COURSE_PRODUCT_CODE;
  });
  if (!checkout) return null;

  const relatedItems = (response.checkoutItems ?? []).filter((item) => String(item.checkout_request_id || '') === String(checkout.id || ''));
  const ownAmount = relatedItems.filter(isOwnCourseLine).reduce((sum, item) => sum + Number(item.line_gross_minor || 0), 0);
  return {
    ...checkout,
    own_course_amount_minor: ownAmount > 0 ? ownAmount : Number(checkout.amount_minor || 0),
  } as OwnCourseCheckoutStatus;
}