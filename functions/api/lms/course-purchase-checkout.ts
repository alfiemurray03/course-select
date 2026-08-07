import { findLibraryCourse, type LibraryCourse } from '../../../src/libraryCatalogue';
import {
  centralPaymentsConfigured,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from '../../_shared/central-payments';
import { resolveCourseAccess } from '../../_shared/course-entitlements';
import {
  validateLearnerEnrolmentDetails,
  type LearnerEnrolmentDetails,
} from '../../_shared/enrolment-details';
import {
  createCentralOwnCourseBasketCheckout,
  ownCoursePricing,
} from '../../_shared/own-course-commerce';
import { createOwnCourseOrder } from '../../_shared/own-course-orders';
import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

const TERMS_VERSION = 'individual-sousa-murray-course-v1.0-2026-08-08';

type CheckoutInput = {
  courseSlugs?: string[];
  learner?: Partial<LearnerEnrolmentDetails>;
  customerType?: 'individual' | 'business';
  organisationName?: string;
  termsAccepted?: boolean;
  immediateAccessRequested?: boolean;
  learnerDetailsConfirmed?: boolean;
  termsVersion?: string;
};

function uniqueCourses(slugs: unknown) {
  if (!Array.isArray(slugs) || slugs.length < 1 || slugs.length > 25) return null;
  const unique = [...new Set(slugs.map((value) => String(value || '').trim()).filter(Boolean))];
  if (!unique.length || unique.length !== slugs.length) return null;
  const courses = unique.map((slug) => findLibraryCourse(slug));
  return courses.every(Boolean) ? courses as LibraryCourse[] : null;
}

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

  let input: CheckoutInput;
  try { input = await request.json<CheckoutInput>(); }
  catch { return Response.json({ error: 'invalid_request', message: 'A valid individual course checkout request is required.' }, { status: 400 }); }

  const courses = uniqueCourses(input.courseSlugs);
  if (!courses) {
    return Response.json({ error: 'invalid_course_basket', message: 'Choose between 1 and 25 different Sousa Murray courses.' }, { status: 400 });
  }

  let learner: LearnerEnrolmentDetails;
  try { learner = validateLearnerEnrolmentDetails(input.learner); }
  catch (error) {
    return Response.json({
      error: String((error as { code?: string })?.code || 'learner_details_required'),
      message: error instanceof Error ? error.message : 'Complete the named learner details before payment.',
    }, { status: Number((error as { status?: number })?.status || 400) });
  }

  if (learner.enrolmentEmail !== access.session.email.trim().toLowerCase()) {
    return Response.json({
      error: 'learner_account_mismatch',
      message: 'For an individual Sousa Murray course purchase, the enrolment email must match the JA Group Services ID that will hold the course and learning record.',
    }, { status: 409 });
  }

  if (input.customerType !== 'individual' && input.customerType !== 'business') {
    return Response.json({ error: 'customer_type_required', message: 'Choose whether you are purchasing as an individual or a business.' }, { status: 400 });
  }
  if (
    input.termsAccepted !== true
    || input.immediateAccessRequested !== true
    || input.learnerDetailsConfirmed !== true
    || input.termsVersion !== TERMS_VERSION
  ) {
    return Response.json({
      error: 'purchase_consent_required',
      message: 'Confirm the learner details, accept the purchase terms and request immediate digital course access before continuing.',
    }, { status: 400 });
  }

  const alreadyAccessible: string[] = [];
  for (const course of courses) {
    const courseAccess = await resolveCourseAccess(env.DB, access.session.accountId, course);
    if (courseAccess.active) alreadyAccessible.push(course.title);
  }
  if (alreadyAccessible.length) {
    return Response.json({
      error: 'course_already_accessible',
      message: `Your learning account already has access to: ${alreadyAccessible.join(', ')}. Remove ${alreadyAccessible.length === 1 ? 'it' : 'them'} from the basket before payment.`,
      courses: alreadyAccessible,
    }, { status: 409 });
  }

  try {
    const profile = await synchroniseElearningCustomer(centralEnv, env.DB, access.session, access.profile);
    const pricing = await ownCoursePricing(centralEnv, courses);
    if (!pricing.configured || !pricing.accessLabel) {
      return Response.json({
        error: 'individual_course_commerce_not_configured',
        message: 'Individual Sousa Murray course pricing and access duration have not yet been configured in Head Office Central Payments.',
      }, { status: 503 });
    }

    const priceByCode = new Map(pricing.items.map((item) => [item.courseCode, item]));
    const allPriced = courses.every((course) => {
      const price = priceByCode.get(course.code);
      return price?.configured && Number(price.grossPence) > 0 && Number(price.netPence) >= 0 && Number(price.vatPence) >= 0;
    });
    if (!allPriced) {
      return Response.json({ error: 'course_price_missing', message: 'One or more selected courses does not have an approved individual purchase price.' }, { status: 503 });
    }

    const expectedTotals = courses.reduce((totals, course) => {
      const price = priceByCode.get(course.code)!;
      return {
        net: totals.net + Number(price.netPence),
        vat: totals.vat + Number(price.vatPence),
        gross: totals.gross + Number(price.grossPence),
      };
    }, { net: 0, vat: 0, gross: 0 });

    const orderReference = `ELEARNING-COURSES-${crypto.randomUUID()}`;
    const baseUrl = new URL(request.url).origin;
    const central = await createCentralOwnCourseBasketCheckout(
      centralEnv,
      profile,
      access.session,
      courses,
      baseUrl,
      orderReference,
    );

    if (
      Number(central.checkout?.amountMinor) !== expectedTotals.gross
      || Number(central.totals?.totalGrossMinor) !== expectedTotals.gross
      || Number(central.totals?.subtotalNetMinor) !== expectedTotals.net
      || Number(central.totals?.vatMinor) !== expectedTotals.vat
      || Number(central.totals?.courseCount) !== courses.length
    ) {
      throw new Error('Central Payments returned totals that do not match the governed Sousa Murray course prices.');
    }

    const orderId = crypto.randomUUID();
    await createOwnCourseOrder(env.DB, {
      id: orderId,
      accountId: access.session.accountId,
      orderReference,
      customerNumber: profile.head_office_customer_number,
      centralPaymentReference: central.checkout!.reference!,
      stripeCheckoutSessionId: central.checkout!.sessionId!,
      subtotalNetPence: expectedTotals.net,
      vatPence: expectedTotals.vat,
      totalGrossPence: expectedTotals.gross,
      accessDays: central.commerce?.accessDays === null ? null : Number(central.commerce?.accessDays),
      learner,
      courses,
      prices: new Map(courses.map((course) => {
        const price = priceByCode.get(course.code)!;
        return [course.code, { netPence: Number(price.netPence), vatPence: Number(price.vatPence), grossPence: Number(price.grossPence) }];
      })),
    });

    await env.DB.prepare(`UPDATE customer_accounts SET
      legal_first_name=?,legal_last_name=?,customer_type=?,organisation_name=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=?`)
      .bind(
        learner.legalFirstName,
        learner.legalLastName,
        input.customerType,
        input.customerType === 'business' ? String(input.organisationName || '').trim() || null : null,
        access.session.accountId,
      ).run();

    await recordLmsAudit(env.DB, request, access.session.accountId, 'individual_course_checkout_created', 'lms_course_purchase_order', orderId, {
      orderReference,
      courseSlugs: courses.map((course) => course.slug),
      courseCodes: courses.map((course) => course.code),
      centralPaymentReference: central.checkout?.reference,
      stripeCheckoutSessionId: central.checkout?.sessionId,
      totalGrossPence: expectedTotals.gross,
      accessDays: central.commerce?.accessDays ?? null,
      termsVersion: TERMS_VERSION,
      learnerDetailsConfirmed: true,
    });

    return Response.json({
      url: central.checkout!.url,
      orderReference,
      courseCount: courses.length,
      totalGrossPence: expectedTotals.gross,
      accessDays: central.commerce?.accessDays ?? null,
      accessLabel: central.commerce?.accessLabel ?? pricing.accessLabel,
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 502);
    return Response.json({
      error: 'individual_course_checkout_failed',
      message: error instanceof Error ? error.message : 'The individual course checkout could not be started.',
    }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
};

export { TERMS_VERSION };
