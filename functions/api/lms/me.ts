import {
  courseDuration,
  findLibraryCourse,
  libraryCourses,
  type CoursePlan,
} from '../../../src/libraryCatalogue';
import {
  centralCourseTrialCheckout,
  centralPaymentsConfigured,
  FREE_TRIAL_COURSE_SLUG,
  syncCentralLmsSubscription,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
import {
  courseEntitlement,
  recordFreeTrialEntitlement,
} from '../../_shared/course-entitlements';
import {
  effectiveLearningSubscription,
  learningPlanName,
  learningPlanTier,
} from '../../_shared/learning-entitlements';
import {
  formatUcn,
  planDefinition,
  requireProductionLms,
  subscriptionHasAccess,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type EnrolmentRow = {
  id: string;
  course_slug: string;
  course_code: string;
  course_version: string;
  status: string;
  progress_percent: number;
  assessment_score: number | null;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

type CertificateRow = {
  id: string;
  certificate_number: string;
  verification_token: string;
  course_slug: string;
  course_code: string;
  course_title: string;
  course_version: string;
  score_percent: number;
  status: string;
  issued_at: string;
};

type StandaloneEntitlementRow = {
  id: string;
  account_id: string;
  course_slug: string;
  course_code: string;
  course_version: string;
  source: 'free_trial' | 'individual_purchase' | 'manual';
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

function courseSummary(course: (typeof libraryCourses)[number], accessSource: string, accessExpiresAt: string | null) {
  return {
    code: course.code,
    slug: course.slug,
    title: course.title,
    category: course.category,
    shortDescription: course.shortDescription,
    level: course.level,
    version: course.version,
    durationMinutes: courseDuration(course),
    durationWeeks: course.studyPlan?.durationWeeks ?? null,
    totalStudyHours: course.studyPlan?.totalQualificationTimeHours ?? null,
    modules: course.modules.length,
    lessons: course.modules.reduce((total, module) => total + module.lessons.length, 0),
    source: 'Sousa Murray Learning Library',
    learningPlatform: 'Sousa Murray LMS',
    accessSource,
    accessExpiresAt,
  };
}

async function migrateLegacyStandaloneEntitlements(db: D1Database, accountId: string, rows: StandaloneEntitlementRow[]) {
  for (const legacy of rows) {
    const programme = findLibraryCourse(legacy.course_slug);
    if (!programme || programme.slug === legacy.course_slug) continue;

    const migratedId = `${legacy.id}:programme:${programme.code}`;
    await db.prepare(`INSERT INTO lms_course_entitlements (
        id,account_id,course_slug,course_code,course_version,source,status,
        product_code,price_code,central_payment_reference,stripe_customer_id,
        stripe_checkout_session_id,claimed_at,starts_at,expires_at,revoked_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(account_id,course_slug,source) DO UPDATE SET
        course_code=excluded.course_code,
        course_version=excluded.course_version,
        status=CASE WHEN lms_course_entitlements.revoked_at IS NULL THEN excluded.status ELSE lms_course_entitlements.status END,
        product_code=COALESCE(excluded.product_code,lms_course_entitlements.product_code),
        price_code=COALESCE(excluded.price_code,lms_course_entitlements.price_code),
        central_payment_reference=COALESCE(excluded.central_payment_reference,lms_course_entitlements.central_payment_reference),
        stripe_customer_id=COALESCE(excluded.stripe_customer_id,lms_course_entitlements.stripe_customer_id),
        stripe_checkout_session_id=COALESCE(excluded.stripe_checkout_session_id,lms_course_entitlements.stripe_checkout_session_id),
        claimed_at=MIN(lms_course_entitlements.claimed_at,excluded.claimed_at),
        starts_at=MIN(lms_course_entitlements.starts_at,excluded.starts_at),
        expires_at=CASE
          WHEN lms_course_entitlements.expires_at IS NULL THEN excluded.expires_at
          WHEN excluded.expires_at IS NULL THEN lms_course_entitlements.expires_at
          ELSE MAX(lms_course_entitlements.expires_at,excluded.expires_at)
        END,
        updated_at=CURRENT_TIMESTAMP`)
      .bind(
        migratedId,
        accountId,
        programme.slug,
        programme.code,
        programme.version,
        legacy.source,
        legacy.status,
        legacy.product_code,
        legacy.price_code,
        legacy.central_payment_reference,
        legacy.stripe_customer_id,
        legacy.stripe_checkout_session_id,
        legacy.claimed_at,
        legacy.starts_at,
        legacy.expires_at,
        legacy.revoked_at,
        legacy.created_at,
      ).run();
  }
}

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;

  let identityProfile = access.profile;
  const centralEnv = env as CentralPaymentsEnv;
  if (centralPaymentsConfigured(centralEnv)) {
    try {
      identityProfile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, identityProfile);
      await syncCentralLmsSubscription(centralEnv, env.DB, access.session, identityProfile);

      const trialCourse = findLibraryCourse(FREE_TRIAL_COURSE_SLUG);
      if (trialCourse) {
        const existingTrial = await courseEntitlement(env.DB, access.session.accountId, trialCourse.slug, trialCourse.version);
        if (!existingTrial) {
          const completedTrial = await centralCourseTrialCheckout(centralEnv, identityProfile);
          if (completedTrial) await recordFreeTrialEntitlement(env.DB, access.session.accountId, trialCourse, completedTrial);
        }
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: 'elearning_central_payments_sync_failed',
        accountId: access.session.accountId,
        message: error instanceof Error ? error.message : 'Unknown Central Payments sync failure',
      }));
    }
  }

  const subscription = await effectiveLearningSubscription(env.DB, access.session.accountId);
  const hasAccess = subscriptionHasAccess(subscription);
  const selectedPlan = subscription ? planDefinition(subscription.plan_id) : null;
  const planName = subscription ? learningPlanName(subscription.plan_id) : null;
  const plan = planName as CoursePlan | null;
  const planTier = subscription ? learningPlanTier(subscription.plan_id) : null;
  const ownedByUser = Boolean(subscription && subscription.account_id === access.session.accountId);

  const initialStandalone = await env.DB.prepare(`
    SELECT id,account_id,course_slug,course_code,course_version,source,status,
           product_code,price_code,central_payment_reference,stripe_customer_id,
           stripe_checkout_session_id,claimed_at,starts_at,expires_at,revoked_at,created_at,updated_at
    FROM lms_course_entitlements
    WHERE account_id=?
    ORDER BY updated_at DESC
  `).bind(access.session.accountId).all<StandaloneEntitlementRow>();
  await migrateLegacyStandaloneEntitlements(env.DB, access.session.accountId, initialStandalone.results ?? []);

  const [enrolmentResult, certificateResult, standaloneResult] = await Promise.all([
    env.DB.prepare(`
      SELECT id, course_slug, course_code, course_version, status,
             progress_percent, assessment_score, enrolled_at,
             started_at, completed_at, updated_at
      FROM lms_enrolments
      WHERE account_id = ?
      ORDER BY updated_at DESC
    `).bind(access.session.accountId).all<EnrolmentRow>(),
    env.DB.prepare(`
      SELECT id, certificate_number, verification_token, course_slug,
             course_code, course_title, course_version, score_percent,
             status, issued_at
      FROM lms_certificates
      WHERE account_id = ?
      ORDER BY issued_at DESC
    `).bind(access.session.accountId).all<CertificateRow>(),
    env.DB.prepare(`
      SELECT id,account_id,course_slug,course_code,course_version,source,status,
             product_code,price_code,central_payment_reference,stripe_customer_id,
             stripe_checkout_session_id,claimed_at,starts_at,expires_at,revoked_at,created_at,updated_at
      FROM lms_course_entitlements
      WHERE account_id=?
      ORDER BY updated_at DESC
    `).bind(access.session.accountId).all<StandaloneEntitlementRow>(),
  ]);

  const activeStandalone = (standaloneResult.results ?? []).filter((item) => (
    item.status === 'active' && !item.revoked_at && (!item.expires_at || Date.parse(item.expires_at) > Date.now())
  ));

  const courseMap = new Map<string, ReturnType<typeof courseSummary>>();
  if (plan && hasAccess) {
    for (const course of libraryCourses.filter((item) => item.includedPlans.includes(plan))) {
      courseMap.set(course.slug, courseSummary(course, 'subscription', subscription?.current_period_end ?? null));
    }
  }
  for (const entitlement of activeStandalone) {
    const course = findLibraryCourse(entitlement.course_slug);
    if (!course) continue;
    courseMap.set(course.slug, courseSummary(course, entitlement.source, entitlement.expires_at));
  }

  const enrolments = enrolmentResult.results ?? [];
  const enrolledSlugs = new Set(enrolments.map((item) => item.course_slug));
  const standaloneAccess = activeStandalone.flatMap((item) => {
    const course = findLibraryCourse(item.course_slug);
    if (!course || course.slug !== item.course_slug) return [];
    return [{
      id: item.id,
      courseSlug: course.slug,
      courseCode: course.code,
      courseVersion: course.version,
      source: item.source,
      startsAt: item.starts_at,
      expiresAt: item.expires_at,
      enrolled: enrolledSlugs.has(course.slug),
    }];
  });

  return Response.json({
    configured: true,
    authenticated: true,
    user: {
      accountId: access.session.accountId,
      name: access.session.name,
      email: access.session.email,
      headOfficeCustomerNumber: formatUcn(identityProfile.head_office_customer_number),
    },
    entitlement: {
      active: hasAccess,
      ownedByUser,
      accessSource: ownedByUser ? 'direct' : subscription ? 'organisation' : 'none',
      plan: selectedPlan ? {
        id: selectedPlan.id,
        name: selectedPlan.name,
        amountPence: selectedPlan.amountPence,
        seatLimit: selectedPlan.seatLimit,
        libraryTier: planTier,
      } : null,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        graceExpiresAt: subscription.grace_expires_at,
      } : null,
    },
    courseAccess: {
      activeStandaloneCount: standaloneAccess.length,
      hasAnyAccess: hasAccess || standaloneAccess.length > 0,
      standalone: standaloneAccess,
    },
    courses: [...courseMap.values()],
    enrolments,
    certificates: certificateResult.results ?? [],
  }, { headers: { 'Cache-Control': 'no-store' } });
};
