import { findLibraryCourse } from '../../../src/libraryCatalogue';
import {
  centralCourseTrialCheckout,
  centralPaymentsConfigured,
  createCentralCourseTrialCheckout,
  FREE_TRIAL_COURSE_SLUG,
  FREE_TRIAL_DURATION_DAYS,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
import {
  courseEntitlement,
  courseEntitlementHasAccess,
  recordFreeTrialEntitlement,
  type CourseEntitlementRow,
} from '../../_shared/course-entitlements';
import {
  recordLmsAudit,
  requireProductionLms,
  type IdentityProfile,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

function trialResponse(entitlement: CourseEntitlementRow | null, checkoutReady: boolean) {
  const active = courseEntitlementHasAccess(entitlement);
  const claimed = Boolean(entitlement);
  return {
    courseSlug: FREE_TRIAL_COURSE_SLUG,
    durationDays: FREE_TRIAL_DURATION_DAYS,
    pricePence: 0,
    checkoutProvider: 'Stripe',
    checkoutReady,
    available: !claimed,
    claimed,
    active,
    status: active ? 'active' : claimed ? 'expired' : 'available',
    startsAt: entitlement?.starts_at ?? null,
    expiresAt: entitlement?.expires_at ?? null,
    source: entitlement?.source ?? null,
  };
}

async function synchroniseTrial(
  env: ProductionLmsEnv,
  accountId: string,
  profile: IdentityProfile,
) {
  if (!env.DB) return { profile, entitlement: null as CourseEntitlementRow | null };
  const course = findLibraryCourse(FREE_TRIAL_COURSE_SLUG);
  if (!course) throw new Error('The configured free trial course could not be found in the Learning Library.');

  let entitlement = await courseEntitlement(env.DB, accountId, course.slug, course.version);
  if (entitlement && entitlement.status === 'active' && entitlement.expires_at && Date.parse(entitlement.expires_at) <= Date.now()) {
    await env.DB.prepare(`UPDATE lms_course_entitlements
      SET status='expired',updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='active'`).bind(entitlement.id).run();
    entitlement = await courseEntitlement(env.DB, accountId, course.slug, course.version);
  }

  const centralEnv = env as CentralPaymentsEnv;
  if (!centralPaymentsConfigured(centralEnv)) return { profile, entitlement };

  const centralProfile = await synchroniseElearningCustomer(centralEnv, env.DB, {
    accountId,
    email: '',
    name: '',
    subject: '',
  } as never, profile).catch(() => profile);

  if (!entitlement) {
    const completedCheckout = await centralCourseTrialCheckout(centralEnv, centralProfile);
    if (completedCheckout) {
      entitlement = await recordFreeTrialEntitlement(env.DB, accountId, course, completedCheckout);
    }
  }

  return { profile: centralProfile, entitlement };
}

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;

  const centralEnv = env as CentralPaymentsEnv;
  let profile = access.profile;
  let entitlement = await courseEntitlement(
    env.DB,
    access.session.accountId,
    FREE_TRIAL_COURSE_SLUG,
    findLibraryCourse(FREE_TRIAL_COURSE_SLUG)?.version ?? '1.0',
  );

  try {
    if (centralPaymentsConfigured(centralEnv)) {
      profile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, profile);
      const completedCheckout = await centralCourseTrialCheckout(centralEnv, profile);
      const course = findLibraryCourse(FREE_TRIAL_COURSE_SLUG);
      if (!course) throw new Error('The free trial course is not available.');
      if (!entitlement && completedCheckout) {
        entitlement = await recordFreeTrialEntitlement(env.DB, access.session.accountId, course, completedCheckout);
        await recordLmsAudit(
          env.DB,
          request,
          access.session.accountId,
          'free_course_trial_activated',
          'lms_course_entitlement',
          entitlement?.id ?? null,
          {
            courseSlug: course.slug,
            centralPaymentReference: completedCheckout.id,
            stripeCheckoutSessionId: completedCheckout.stripe_checkout_session_id,
            expiresAt: entitlement?.expires_at ?? null,
          },
        );
      }
    }

    if (entitlement && entitlement.status === 'active' && entitlement.expires_at && Date.parse(entitlement.expires_at) <= Date.now()) {
      await env.DB.prepare(`UPDATE lms_course_entitlements
        SET status='expired',updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND status='active'`).bind(entitlement.id).run();
      const course = findLibraryCourse(FREE_TRIAL_COURSE_SLUG);
      entitlement = course
        ? await courseEntitlement(env.DB, access.session.accountId, course.slug, course.version)
        : entitlement;
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: 'free_course_trial_sync_failed',
      accountId: access.session.accountId,
      message: error instanceof Error ? error.message : 'Unknown free trial sync failure',
    }));
  }

  return Response.json(
    trialResponse(entitlement, centralPaymentsConfigured(centralEnv)),
    { headers: { 'Cache-Control': 'no-store' } },
  );
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;
  const centralEnv = env as CentralPaymentsEnv;
  if (!centralPaymentsConfigured(centralEnv)) {
    return Response.json({
      error: 'central_payments_not_connected',
      message: 'JA Group Services Central Payments is not connected to Sousa Murray eLearning.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const course = findLibraryCourse(FREE_TRIAL_COURSE_SLUG);
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });

  try {
    const profile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, access.profile);
    const completedCheckout = await centralCourseTrialCheckout(centralEnv, profile);
    let entitlement = await courseEntitlement(env.DB, access.session.accountId, course.slug, course.version);
    if (!entitlement && completedCheckout) {
      entitlement = await recordFreeTrialEntitlement(env.DB, access.session.accountId, course, completedCheckout);
    }
    if (entitlement) {
      return Response.json({
        error: 'free_trial_already_claimed',
        message: courseEntitlementHasAccess(entitlement)
          ? 'This account already has an active free trial for this course.'
          : 'The free trial for this course has already been used on this account.',
        trial: trialResponse(entitlement, true),
      }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    const checkout = await createCentralCourseTrialCheckout(
      centralEnv,
      profile,
      access.session,
      new URL(request.url).origin,
    );

    await recordLmsAudit(
      env.DB,
      request,
      access.session.accountId,
      'free_course_trial_checkout_created',
      'central_payment_checkout',
      checkout.reference,
      {
        courseSlug: course.slug,
        durationDays: FREE_TRIAL_DURATION_DAYS,
        stripeCheckoutSessionId: checkout.sessionId,
        amountPence: 0,
      },
    );

    return Response.json({
      url: checkout.url,
      reference: checkout.reference,
      sessionId: checkout.sessionId,
      courseSlug: course.slug,
      durationDays: FREE_TRIAL_DURATION_DAYS,
      pricePence: 0,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 502);
    return Response.json({
      error: 'free_trial_checkout_failed',
      message: error instanceof Error ? error.message : 'The free trial checkout could not be started.',
    }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
};
