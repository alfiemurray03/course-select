import { findLibraryCourse, flattenCourseLessons } from '../../../src/libraryCatalogue';
import { type CentralPaymentsEnv } from '../../_shared/central-payments';
import { recordIndividualPurchaseEntitlement } from '../../_shared/course-entitlements';
import type { LearnerEnrolmentDetails } from '../../_shared/enrolment-details';
import { centralOwnCourseCheckoutStatus } from '../../_shared/own-course-commerce';
import {
  markOwnCourseOrderCompleted,
  ownCourseOrderByReference,
} from '../../_shared/own-course-orders';
import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';
import { ensureStandaloneCourseEnrolment } from '../../_shared/standalone-course-enrolment';

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;

  const orderReference = new URL(request.url).searchParams.get('order')?.trim() || '';
  if (!orderReference || orderReference.length > 120) {
    return Response.json({ error: 'order_reference_required', message: 'A valid course order reference is required.' }, { status: 400 });
  }

  const local = await ownCourseOrderByReference(env.DB, access.session.accountId, orderReference);
  if (!local.order) {
    return Response.json({ error: 'order_not_found', message: 'This course order could not be found for the signed-in learning account.' }, { status: 404 });
  }

  if (local.order.status === 'completed') {
    return Response.json({
      completed: true,
      orderReference,
      courses: local.items.map((item) => {
        const course = findLibraryCourse(item.course_slug);
        return {
          slug: item.course_slug,
          code: item.course_code,
          title: item.course_title,
          firstLessonId: course ? flattenCourseLessons(course)[0]?.id ?? null : null,
        };
      }),
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const checkout = await centralOwnCourseCheckoutStatus(env as CentralPaymentsEnv, orderReference);
    if (!checkout) {
      return Response.json({ completed: false, status: 'pending', orderReference }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (String(checkout.customer_number || '') !== String(local.order.head_office_customer_number || '')) {
      throw new Error('The Central Payments customer does not match the local course order.');
    }
    const ownCoursePaymentAmount = Number(checkout.own_course_amount_minor ?? checkout.amount_minor ?? 0);
    if (ownCoursePaymentAmount !== Number(local.order.total_gross_pence || 0)) {
      throw new Error('The Central Payments Sousa Murray course amount does not match the local course order total.');
    }
    if (String(checkout.status || '').toLowerCase() !== 'completed') {
      return Response.json({ completed: false, status: checkout.status || 'pending', orderReference }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const learner: LearnerEnrolmentDetails = {
      legalFirstName: local.order.learner_first_name,
      legalLastName: local.order.learner_last_name,
      enrolmentEmail: local.order.learner_email,
    };
    const accessDays = local.order.access_mode === 'permanent' ? null : Number(local.order.access_days);
    const fulfilled: Array<{ slug: string; code: string; title: string; firstLessonId: string | null }> = [];

    for (const item of local.items) {
      const course = findLibraryCourse(item.course_slug);
      if (!course || course.code !== item.course_code) {
        throw new Error(`The purchased course ${item.course_code} is no longer available in the Sousa Murray catalogue.`);
      }
      const entitlement = await recordIndividualPurchaseEntitlement(env.DB, access.session.accountId, course, checkout, accessDays);
      if (!entitlement) throw new Error(`The entitlement for ${course.code} could not be created.`);
      await ensureStandaloneCourseEnrolment(env.DB, access.session.accountId, course, entitlement, learner);
      fulfilled.push({
        slug: course.slug,
        code: course.code,
        title: course.title,
        firstLessonId: flattenCourseLessons(course)[0]?.id ?? null,
      });
    }

    await markOwnCourseOrderCompleted(env.DB, local.order.id);
    await recordLmsAudit(env.DB, request, access.session.accountId, 'individual_course_order_fulfilled', 'lms_course_purchase_order', local.order.id, {
      orderReference,
      centralPaymentReference: checkout.id,
      stripeCheckoutSessionId: checkout.stripe_checkout_session_id,
      courseSlugs: fulfilled.map((course) => course.slug),
      learnerEmail: learner.enrolmentEmail,
      accessDays,
      sharedStripeCheckout: String(checkout.product_code || '').toUpperCase() === 'ELEARNING_UNIFIED_COURSE_BASKET',
    });

    return Response.json({
      completed: true,
      orderReference,
      courses: fulfilled,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      completed: false,
      status: 'error',
      orderReference,
      message: error instanceof Error ? error.message : 'The course order could not be fulfilled into the LMS.',
    }, { status: Number((error as { status?: number })?.status || 502), headers: { 'Cache-Control': 'no-store' } });
  }
};