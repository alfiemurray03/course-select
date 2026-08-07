import {
  courseDuration,
  libraryCourses,
  type CoursePlan,
} from '../../../src/libraryCatalogue';
import {
  centralPaymentsConfigured,
  syncCentralLmsSubscription,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
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

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;

  let identityProfile = access.profile;
  const centralEnv = env as CentralPaymentsEnv;
  if (centralPaymentsConfigured(centralEnv)) {
    try {
      identityProfile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, identityProfile);
      await syncCentralLmsSubscription(centralEnv, env.DB, access.session, identityProfile);
    } catch (error) {
      // Learning records remain available during a temporary Head Office outage.
      // Checkout itself fails closed, but an already-synchronised entitlement is
      // not destroyed merely because the central status request is unavailable.
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

  const [enrolmentResult, certificateResult] = await Promise.all([
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
  ]);

  const availableCourses = plan && hasAccess
    ? libraryCourses.filter((course) => course.includedPlans.includes(plan)).map((course) => ({
        code: course.code,
        slug: course.slug,
        title: course.title,
        category: course.category,
        shortDescription: course.shortDescription,
        level: course.level,
        version: course.version,
        durationMinutes: courseDuration(course),
        modules: course.modules.length,
        lessons: course.modules.reduce((total, module) => total + module.lessons.length, 0),
        source: 'Sousa Murray Learning Library',
        learningPlatform: 'Sousa Murray LMS',
      }))
    : [];

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
    courses: availableCourses,
    enrolments: enrolmentResult.results ?? [],
    certificates: certificateResult.results ?? [],
  }, { headers: { 'Cache-Control': 'no-store' } });
};