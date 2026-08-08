import { findLibraryCourse } from '../../../src/libraryCatalogue';
import { FREE_TRIAL_OFFERS, freeTrialOfferForSlug, type FreeTrialOffer } from '../../../src/freeTrialOffers';
import {
  centralPaymentsConfigured,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
import {
  courseEntitlement,
  courseEntitlementHasAccess,
  type CourseEntitlementRow,
} from '../../_shared/course-entitlements';
import {
  completedProgrammeTrialCheckout,
  createProgrammeTrialCheckout,
  recordProgrammeTrialEntitlement,
} from '../../_shared/programme-trials';
import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

function trialResponse(offer: FreeTrialOffer, entitlement: CourseEntitlementRow | null, checkoutReady: boolean) {
  const active = courseEntitlementHasAccess(entitlement);
  const claimed = Boolean(entitlement);
  return {
    courseSlug: offer.courseSlug,
    courseTitle: offer.courseTitle,
    durationDays: offer.durationDays,
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

function offerFromUrl(request: Request) {
  const url = new URL(request.url);
  return freeTrialOfferForSlug(url.searchParams.get('courseSlug')) ?? FREE_TRIAL_OFFERS[0] ?? null;
}

async function offerFromPost(request: Request) {
  const body = await request.json<{ courseSlug?: string }>().catch(() => ({}));
  return freeTrialOfferForSlug(body.courseSlug) ?? (body.courseSlug ? null : FREE_TRIAL_OFFERS[0] ?? null);
}

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !access.profile || !env.DB) return access.response;

  const offer = offerFromUrl(request);
  if (!offer) return Response.json({ error: 'free_trial_not_available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const course = findLibraryCourse(offer.courseSlug);
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const centralEnv = env as CentralPaymentsEnv;
  let profile = access.profile;
  let entitlement = await courseEntitlement(env.DB, access.session.accountId, course.slug, course.version);

  try {
    if (centralPaymentsConfigured(centralEnv)) {
      profile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, profile);
      const completedCheckout = await completedProgrammeTrialCheckout(centralEnv, profile, offer.courseSlug);
      if (!entitlement && completedCheckout) {
        entitlement = await recordProgrammeTrialEntitlement(env.DB, access.session.accountId, course, completedCheckout);
        await recordLmsAudit(
          env.DB,
          request,
          access.session.accountId,
          'free_course_trial_activated',
          'lms_course_entitlement',
          entitlement?.id ?? null,
          {
            courseSlug: course.slug,
            courseTitle: course.title,
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
      entitlement = await courseEntitlement(env.DB, access.session.accountId, course.slug, course.version);
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: 'free_course_trial_sync_failed',
      accountId: access.session.accountId,
      courseSlug: offer.courseSlug,
      message: error instanceof Error ? error.message : 'Unknown free trial sync failure',
    }));
  }

  return Response.json(
    trialResponse(offer, entitlement, centralPaymentsConfigured(centralEnv)),
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

  const offer = await offerFromPost(request);
  if (!offer) {
    return Response.json({
      error: 'free_trial_not_available',
      message: 'This programme does not currently have a free trial offer.',
    }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const course = findLibraryCourse(offer.courseSlug);
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  try {
    const profile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, access.profile);
    const completedCheckout = await completedProgrammeTrialCheckout(centralEnv, profile, offer.courseSlug);
    let entitlement = await courseEntitlement(env.DB, access.session.accountId, course.slug, course.version);
    if (!entitlement && completedCheckout) {
      entitlement = await recordProgrammeTrialEntitlement(env.DB, access.session.accountId, course, completedCheckout);
    }
    if (entitlement) {
      return Response.json({
        error: 'free_trial_already_claimed',
        message: courseEntitlementHasAccess(entitlement)
          ? 'This account already has an active free trial for this programme.'
          : 'The free trial for this programme has already been used on this account.',
        trial: trialResponse(offer, entitlement, true),
      }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    const checkout = await createProgrammeTrialCheckout(
      centralEnv,
      profile,
      access.session,
      new URL(request.url).origin,
      offer.courseSlug,
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
        courseTitle: course.title,
        durationDays: offer.durationDays,
        stripeCheckoutSessionId: checkout.sessionId,
        amountPence: 0,
      },
    );

    return Response.json({
      url: checkout.url,
      reference: checkout.reference,
      sessionId: checkout.sessionId,
      courseSlug: course.slug,
      courseTitle: course.title,
      durationDays: offer.durationDays,
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
