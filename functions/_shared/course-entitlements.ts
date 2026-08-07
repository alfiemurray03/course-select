import type { LibraryCourse } from '../../src/libraryCatalogue';
import {
  FREE_TRIAL_DURATION_DAYS,
  FREE_TRIAL_PRICE_CODE,
  FREE_TRIAL_PRODUCT_CODE,
  type CentralCheckoutRequest,
} from './central-payments';
import {
  effectiveLearningSubscription,
  subscriptionIncludesCourse,
} from './learning-entitlements';
import {
  stableId,
  type SubscriptionRow,
} from './production-lms';

export type CourseEntitlementSource = 'free_trial' | 'individual_purchase' | 'manual';

export type CourseEntitlementRow = {
  id: string;
  account_id: string;
  course_slug: string;
  course_code: string;
  course_version: string;
  source: CourseEntitlementSource;
  status: string;
  product_code: string | null;
  price_code: string | null;
  central_payment_reference: string | null;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  claimed_at: string;
  starts_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ResolvedCourseAccess = {
  active: boolean;
  source: 'subscription' | CourseEntitlementSource | 'none';
  subscription: SubscriptionRow | null;
  entitlement: CourseEntitlementRow | null;
};

export async function courseEntitlement(
  db: D1Database,
  accountId: string,
  courseSlug: string,
  courseVersion: string,
) {
  return db.prepare(`
    SELECT id,account_id,course_slug,course_code,course_version,source,status,
           product_code,price_code,central_payment_reference,stripe_customer_id,
           stripe_checkout_session_id,claimed_at,starts_at,expires_at,revoked_at,
           created_at,updated_at
    FROM lms_course_entitlements
    WHERE account_id=? AND course_slug=? AND course_version=?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(accountId, courseSlug, courseVersion).first<CourseEntitlementRow>();
}

export function courseEntitlementHasAccess(entitlement: CourseEntitlementRow | null) {
  if (!entitlement || entitlement.status !== 'active' || entitlement.revoked_at) return false;
  if (!entitlement.expires_at) return true;
  return Date.parse(entitlement.expires_at) > Date.now();
}

export async function resolveCourseAccess(
  db: D1Database,
  accountId: string,
  course: LibraryCourse,
): Promise<ResolvedCourseAccess> {
  const subscription = await effectiveLearningSubscription(db, accountId);
  if (subscriptionIncludesCourse(subscription, course.includedPlans)) {
    return { active: true, source: 'subscription', subscription, entitlement: null };
  }

  const entitlement = await courseEntitlement(db, accountId, course.slug, course.version);
  if (courseEntitlementHasAccess(entitlement)) {
    return { active: true, source: entitlement!.source, subscription: null, entitlement };
  }

  return { active: false, source: 'none', subscription: null, entitlement };
}

function trialDates(checkout: CentralCheckoutRequest) {
  const startsAt = checkout.completed_at || checkout.updated_at || checkout.created_at || new Date().toISOString();
  const parsed = Date.parse(startsAt);
  const safeStart = Number.isFinite(parsed) ? new Date(parsed) : new Date();
  const expires = new Date(safeStart.getTime() + FREE_TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return {
    startsAt: safeStart.toISOString(),
    expiresAt: expires.toISOString(),
    status: expires.getTime() > Date.now() ? 'active' : 'expired',
  };
}

export async function recordFreeTrialEntitlement(
  db: D1Database,
  accountId: string,
  course: LibraryCourse,
  checkout: CentralCheckoutRequest,
) {
  if (
    String(checkout.product_code || '').toUpperCase() !== FREE_TRIAL_PRODUCT_CODE
    || String(checkout.price_code || '').toUpperCase() !== FREE_TRIAL_PRICE_CODE
    || String(checkout.status || '').toLowerCase() !== 'completed'
    || Number(checkout.amount_minor || 0) !== 0
  ) {
    throw new Error('The Central Payments record is not a completed Sousa Murray free course trial order.');
  }

  const { startsAt, expiresAt, status } = trialDates(checkout);
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
    FREE_TRIAL_PRODUCT_CODE,
    FREE_TRIAL_PRICE_CODE,
    checkout.id,
    checkout.stripe_customer_id || null,
    checkout.stripe_checkout_session_id || null,
    startsAt,
    startsAt,
    expiresAt,
  ).run();

  return courseEntitlement(db, accountId, course.slug, course.version);
}

export async function ensureStandaloneEnrolmentBridge(
  db: D1Database,
  accountId: string,
  entitlement: CourseEntitlementRow,
) {
  if (!entitlement.stripe_customer_id) {
    throw new Error('The free trial is missing its Central Payments Stripe customer reference.');
  }
  const subscriptionId = await stableId('lms-standalone-access', entitlement.id);
  const syntheticStripeSubscriptionId = `standalone-access:${entitlement.id}`;

  await db.prepare(`
    INSERT INTO lms_subscriptions (
      id,account_id,plan_id,stripe_customer_id,stripe_subscription_id,
      stripe_checkout_session_id,status,seat_limit,current_period_start,current_period_end,
      cancel_at_period_end,cancelled_at,grace_expires_at
    ) VALUES (?,?,'learner',?,?,?,'paused',1,?,?,0,NULL,NULL)
    ON CONFLICT(stripe_subscription_id) DO UPDATE SET
      stripe_customer_id=excluded.stripe_customer_id,
      stripe_checkout_session_id=excluded.stripe_checkout_session_id,
      current_period_start=excluded.current_period_start,
      current_period_end=excluded.current_period_end,
      status='paused',
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    subscriptionId,
    accountId,
    entitlement.stripe_customer_id,
    syntheticStripeSubscriptionId,
    entitlement.stripe_checkout_session_id,
    entitlement.starts_at,
    entitlement.expires_at,
  ).run();

  return subscriptionId;
}
