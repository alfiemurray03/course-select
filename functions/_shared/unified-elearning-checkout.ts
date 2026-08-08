import { catalogue, tierForQuantity, type Course } from '../../src/catalogue';
import { findLibraryCourse, type LibraryCourse } from '../../src/libraryCatalogue';
import {
  centralPaymentsConfigured,
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from './central-payments';
import { resolveCourseAccess } from './course-entitlements';
import { validateLearnerEnrolmentDetails, type LearnerEnrolmentDetails } from './enrolment-details';
import { ownCoursePricing } from './own-course-commerce';
import { createOwnCourseOrder } from './own-course-orders';
import {
  ensureProfessionalTrainingOrderSchema,
  seedProfessionalTrainingCatalogueRows,
} from './professional-training-orders';
import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from './production-lms';

export type UnifiedElearningEnv = ProductionLmsEnv & CentralPaymentsEnv;

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';
const ONLINE_LICENCE_LIMIT = 25;
export const UNIFIED_TERMS_VERSION = 'unified-elearning-basket-v1.0-2026-08-08';

const catalogueById = new Map(catalogue.map((course) => [course.id, course]));

type HighfieldItemRequest = { courseId?: string; quantity?: number };
type CustomerRequest = {
  type?: string;
  legalFirstName?: string;
  legalLastName?: string;
  enrolmentEmail?: string;
  organisationName?: string;
  providerConsent?: boolean;
  authorityConfirmed?: boolean;
};
type LearnerRequest = {
  courseId?: string;
  position?: number;
  legalFirstName?: string;
  legalLastName?: string;
  enrolmentEmail?: string;
};
type CheckoutInput = {
  unifiedBasket?: boolean;
  highfieldItems?: HighfieldItemRequest[];
  ownCourseSlugs?: string[];
  customer?: CustomerRequest;
  learnerSubmission?: { method?: string; learners?: LearnerRequest[] };
  termsAccepted?: boolean;
  immediateAccessRequested?: boolean;
  learnerDetailsConfirmed?: boolean;
  termsVersion?: string;
};
type ValidCustomer = {
  type: 'individual' | 'business';
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
  organisationName: string | null;
};
type ValidLearner = {
  courseId: string;
  position: number;
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
};

type CentralResponse = {
  checkout?: {
    reference?: string;
    sessionId?: string;
    url?: string;
    amountMinor?: number;
    currency?: string;
  };
  totals?: {
    subtotalNetMinor?: number;
    vatMinor?: number;
    totalGrossMinor?: number;
    lineCount?: number;
    ownCourseCount?: number;
    highfieldLineCount?: number;
    highfieldLicenceCount?: number;
  };
};

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > maximumLength || /[\u0000-\u001F\u007F]/.test(cleaned)) return null;
  return cleaned;
}

function normaliseEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normaliseCustomer(customer?: CustomerRequest): ValidCustomer | null {
  if (!customer || (customer.type !== 'individual' && customer.type !== 'business')) return null;
  const legalFirstName = cleanText(customer.legalFirstName, 80);
  const legalLastName = cleanText(customer.legalLastName, 80);
  const enrolmentEmail = normaliseEmail(customer.enrolmentEmail);
  const organisationName = typeof customer.organisationName === 'string' && customer.organisationName.trim()
    ? cleanText(customer.organisationName, 160)
    : null;
  if (!legalFirstName || !legalLastName || !enrolmentEmail) return null;
  if (customer.type === 'business' && !organisationName) return null;
  return { type: customer.type, legalFirstName, legalLastName, enrolmentEmail, organisationName };
}

function normaliseHighfieldItems(items: HighfieldItemRequest[] | undefined) {
  if (!items?.length) return [] as Array<{ courseId: string; quantity: number }>;
  if (items.length > ONLINE_LICENCE_LIMIT) return null;
  const combined = new Map<string, number>();
  for (const item of items) {
    const courseId = cleanText(item.courseId, 180);
    const quantity = Number(item.quantity);
    if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > ONLINE_LICENCE_LIMIT) return null;
    combined.set(courseId, (combined.get(courseId) ?? 0) + quantity);
  }
  const normalised = [...combined.entries()].map(([courseId, quantity]) => ({ courseId, quantity }));
  const total = normalised.reduce((sum, item) => sum + item.quantity, 0);
  if (total > ONLINE_LICENCE_LIMIT || normalised.some((item) => item.quantity > ONLINE_LICENCE_LIMIT)) return null;
  return normalised;
}

function normaliseOwnCourses(slugs: string[] | undefined) {
  if (!slugs?.length) return [] as LibraryCourse[];
  if (slugs.length > 25) return null;
  const unique = [...new Set(slugs.map((slug) => String(slug || '').trim()).filter(Boolean))];
  if (unique.length !== slugs.length) return null;
  const courses = unique.map((slug) => findLibraryCourse(slug));
  return courses.every(Boolean) ? courses as LibraryCourse[] : null;
}

function normaliseManualLearners(
  submission: CheckoutInput['learnerSubmission'],
  items: Array<{ courseId: string; quantity: number }>,
) {
  const expectedTotal = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!expectedTotal) return [] as ValidLearner[];
  if (submission?.method !== 'manual' || !Array.isArray(submission.learners) || submission.learners.length !== expectedTotal) return null;
  const expectedByCourse = new Map(items.map((item) => [item.courseId, item.quantity]));
  const positions = new Set<string>();
  const learners: ValidLearner[] = [];
  for (const raw of submission.learners) {
    const courseId = cleanText(raw.courseId, 180);
    const position = Number(raw.position);
    const legalFirstName = cleanText(raw.legalFirstName, 80);
    const legalLastName = cleanText(raw.legalLastName, 80);
    const enrolmentEmail = normaliseEmail(raw.enrolmentEmail);
    const max = courseId ? expectedByCourse.get(courseId) : undefined;
    if (!courseId || !max || !Number.isInteger(position) || position < 1 || position > max || !legalFirstName || !legalLastName || !enrolmentEmail) return null;
    const key = `${courseId}:${position}`;
    if (positions.has(key)) return null;
    positions.add(key);
    learners.push({ courseId, position, legalFirstName, legalLastName, enrolmentEmail });
  }
  return learners;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function identityId(prefix: string, value: string) {
  return `${prefix}-${(await sha256Hex(value)).slice(0, 40)}`;
}

async function centralUnifiedCheckout(
  env: UnifiedElearningEnv,
  body: Record<string, unknown>,
) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  if (!token) throw Object.assign(new Error('The Head Office Central Payments connection is not configured.'), { status: 503 });
  const response = await fetch(`${base}/api/v1/payments/elearning-basket-checkout`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error && typeof data.error === 'object' ? data.error as Record<string, unknown> : null;
    const error = new Error(typeof detail?.message === 'string' ? detail.message : `Head Office Central Payments returned HTTP ${response.status}.`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as CentralResponse;
}

async function createHighfieldLocalOrder(
  db: D1Database,
  orderId: string,
  customer: ValidCustomer,
  rows: Array<{ course: Course; quantity: number; tier: ReturnType<typeof tierForQuantity>; tierId: string }>,
  learners: ValidLearner[],
  stripeCheckoutSessionId: string,
) {
  const customerId = await identityId('customer', customer.enrolmentEmail);
  const customerAccountType = customer.type === 'business' ? 'organisation' : 'individual';
  const orderItems = rows.map((row) => ({ row, id: `order-item-${crypto.randomUUID()}` }));
  const orderItemByCourse = new Map(orderItems.map((item) => [item.row.course.id, item.id]));
  const uniqueLearners = new Map<string, ValidLearner>();
  for (const learner of learners) uniqueLearners.set(learner.enrolmentEmail, learner);
  const learnerIdByEmail = new Map<string, string>();
  await Promise.all([...uniqueLearners.keys()].map(async (email) => learnerIdByEmail.set(email, await identityId('learner', email))));
  const primaryLearnerId = learners[0] ? learnerIdByEmail.get(learners[0].enrolmentEmail) ?? null : null;
  const totals = rows.reduce((sum, row) => ({
    net: sum.net + row.tier.aptenvoNetPence * row.quantity,
    vat: sum.vat + row.tier.vatPence * row.quantity,
    gross: sum.gross + row.tier.aptenvoGrossPence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 });

  await db.batch([
    db.prepare(`INSERT INTO customers (id,email,first_name,last_name,account_type,status)
      VALUES (?,?,?,?,?,'active') ON CONFLICT(id) DO UPDATE SET email=excluded.email,first_name=excluded.first_name,
      last_name=excluded.last_name,account_type=excluded.account_type,status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(customerId, customer.enrolmentEmail, customer.legalFirstName, customer.legalLastName, customerAccountType),
    ...[...uniqueLearners.entries()].map(([email, learner]) => db.prepare(`INSERT INTO learners
      (id,customer_id,email,first_name,last_name,status) VALUES (?,?,?,?,?,'active')
      ON CONFLICT(id) DO UPDATE SET customer_id=COALESCE(learners.customer_id,excluded.customer_id),email=excluded.email,
      first_name=excluded.first_name,last_name=excluded.last_name,status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(learnerIdByEmail.get(email), email === customer.enrolmentEmail ? customerId : null, email, learner.legalFirstName, learner.legalLastName)),
    db.prepare(`INSERT INTO orders (id,customer_id,status,currency,subtotal_pence,vat_pence,total_pence,stripe_checkout_session_id,customer_email)
      VALUES (?,?,'awaiting_payment','GBP',?,?,?,?,?)`)
      .bind(orderId, customerId, totals.net, totals.vat, totals.gross, stripeCheckoutSessionId, customer.enrolmentEmail),
    db.prepare(`INSERT INTO order_enrolment_details
      (order_id,customer_type,legal_first_name,legal_last_name,enrolment_email,organisation_name,learner_id,
       provider_sharing_consent,consent_recorded_at,additional_learner_details_required,fulfilment_status)
      VALUES (?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP,0,'pending_payment')`)
      .bind(orderId, customer.type, customer.legalFirstName, customer.legalLastName, customer.enrolmentEmail, customer.organisationName, primaryLearnerId),
    db.prepare(`INSERT INTO order_learner_submissions
      (order_id,method,expected_learner_count,submitted_learner_count,authority_confirmed,status)
      VALUES (?,'manual',?,?,1,'pending_payment')`)
      .bind(orderId, learners.length, learners.length),
    ...orderItems.map(({ row, id }) => db.prepare(`INSERT INTO order_items
      (id,order_id,course_id,price_tier_id,quantity,unit_net_pence,unit_vat_pence,unit_gross_pence,line_net_pence,line_vat_pence,line_gross_pence,fulfilment_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'not_started')`)
      .bind(id, orderId, row.course.id, row.tierId, row.quantity, row.tier.aptenvoNetPence, row.tier.vatPence,
        row.tier.aptenvoGrossPence, row.tier.aptenvoNetPence * row.quantity, row.tier.vatPence * row.quantity,
        row.tier.aptenvoGrossPence * row.quantity)),
    ...learners.map((learner) => db.prepare(`INSERT INTO order_learner_assignments
      (id,order_id,order_item_id,course_id,learner_id,position,legal_first_name,legal_last_name,enrolment_email,source,status)
      VALUES (?,?,?,?,?,?,?,?,?,'manual','pending_payment')`)
      .bind(`learner-assignment-${crypto.randomUUID()}`, orderId, orderItemByCourse.get(learner.courseId), learner.courseId,
        learnerIdByEmail.get(learner.enrolmentEmail), learner.position, learner.legalFirstName, learner.legalLastName, learner.enrolmentEmail)),
  ]);

  return totals;
}

export async function handleUnifiedElearningCheckout(request: Request, env: UnifiedElearningEnv) {
  if (!env.DB) return Response.json({ error: 'database_not_bound', message: 'The Sousa Murray eLearning database is not connected.' }, { status: 503 });
  if (!centralPaymentsConfigured(env)) return Response.json({ error: 'central_payments_not_connected', message: 'JA Group Services Central Payments is not connected.' }, { status: 503 });

  const auth = await requireProductionLms(request, env);
  if (auth.response || !auth.session || !auth.profile) {
    return auth.response ?? Response.json({ error: 'sign_in_required', message: 'Sign in with JA Group Services ID before proceeding to payment.' }, { status: 401 });
  }

  let input: CheckoutInput;
  try {
    const form = await request.formData();
    const raw = form.get('payload');
    if (typeof raw !== 'string') throw new Error('missing_payload');
    input = JSON.parse(raw) as CheckoutInput;
  } catch {
    return Response.json({ error: 'invalid_request', message: 'A valid unified basket checkout request is required.' }, { status: 400 });
  }

  if (input.unifiedBasket !== true) return Response.json({ error: 'invalid_unified_basket', message: 'The unified basket marker is missing.' }, { status: 400 });
  const highfieldItems = normaliseHighfieldItems(input.highfieldItems);
  const ownCourses = normaliseOwnCourses(input.ownCourseSlugs);
  if (!highfieldItems || !ownCourses || (!highfieldItems.length && !ownCourses.length) || highfieldItems.length + ownCourses.length > 25) {
    return Response.json({ error: 'invalid_basket', message: 'The basket contains an invalid course selection.' }, { status: 400 });
  }

  const customer = normaliseCustomer(input.customer);
  if (!customer) return Response.json({ error: 'invalid_customer_details', message: 'Complete the customer details before checkout.' }, { status: 400 });
  if (customer.enrolmentEmail !== auth.session.email.trim().toLowerCase()) {
    return Response.json({ error: 'customer_account_mismatch', message: 'The customer email must match the signed-in JA Group Services ID.' }, { status: 409 });
  }
  if (input.termsAccepted !== true || input.immediateAccessRequested !== true || input.learnerDetailsConfirmed !== true || input.termsVersion !== UNIFIED_TERMS_VERSION) {
    return Response.json({ error: 'purchase_consent_required', message: 'Confirm the learner details, terms and immediate digital supply before checkout.' }, { status: 400 });
  }
  if (highfieldItems.length && (input.customer?.providerConsent !== true || input.customer?.authorityConfirmed !== true)) {
    return Response.json({ error: 'provider_consent_required', message: 'Confirm the Highfield learner-data and enrolment declarations before checkout.' }, { status: 400 });
  }

  const highfieldLearners = normaliseManualLearners(input.learnerSubmission, highfieldItems);
  if (!highfieldLearners) {
    return Response.json({ error: 'incomplete_learner_details', message: 'Provide one named learner record for every Highfield licence in the basket.' }, { status: 400 });
  }

  const highfieldRows = highfieldItems.map((item) => {
    const course = catalogueById.get(item.courseId);
    if (!course) return null;
    const tier = tierForQuantity(course, item.quantity);
    return { course, quantity: item.quantity, tier, tierId: `${course.id}-tier-${tier.minQuantity}` };
  });
  if (highfieldRows.some((row) => !row)) return Response.json({ error: 'course_not_found', message: 'One or more Highfield courses could not be found.' }, { status: 404 });
  const typedHighfieldRows = highfieldRows as Array<{ course: Course; quantity: number; tier: ReturnType<typeof tierForQuantity>; tierId: string }>;

  for (const course of ownCourses) {
    const existing = await resolveCourseAccess(env.DB, auth.session.accountId, course);
    if (existing.active) {
      return Response.json({ error: 'course_already_accessible', message: `${course.title} is already available in this learning account. Remove it from the basket before payment.` }, { status: 409 });
    }
  }

  let profile;
  try { profile = await synchroniseElearningCustomer(env, env.DB, auth.session, auth.profile); }
  catch (error) {
    return Response.json({ error: 'customer_reconciliation_failed', message: error instanceof Error ? error.message : 'Head Office could not reconcile the customer.' }, { status: 409 });
  }

  let ownPricing = { configured: true, accessDays: null as number | null, accessLabel: null as string | null, items: [] as Awaited<ReturnType<typeof ownCoursePricing>>['items'] };
  if (ownCourses.length) {
    try { ownPricing = await ownCoursePricing(env, ownCourses); }
    catch (error) { return Response.json({ error: 'own_course_pricing_failed', message: error instanceof Error ? error.message : 'Sousa Murray course pricing could not be loaded.' }, { status: 502 }); }
    if (!ownPricing.configured || !ownPricing.accessLabel || ownPricing.items.some((item) => !item.configured || !Number(item.grossPence))) {
      return Response.json({ error: 'own_course_pricing_not_ready', message: 'One or more Sousa Murray courses does not yet have an approved individual purchase price.' }, { status: 503 });
    }
  }

  const ownPriceByCode = new Map(ownPricing.items.map((item) => [item.courseCode, item]));
  const ownTotals = ownCourses.reduce((sum, course) => {
    const price = ownPriceByCode.get(course.code);
    return {
      net: sum.net + Number(price?.netPence || 0),
      vat: sum.vat + Number(price?.vatPence || 0),
      gross: sum.gross + Number(price?.grossPence || 0),
    };
  }, { net: 0, vat: 0, gross: 0 });
  const highfieldTotals = typedHighfieldRows.reduce((sum, row) => ({
    net: sum.net + row.tier.aptenvoNetPence * row.quantity,
    vat: sum.vat + row.tier.vatPence * row.quantity,
    gross: sum.gross + row.tier.aptenvoGrossPence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 });
  const expected = {
    net: ownTotals.net + highfieldTotals.net,
    vat: ownTotals.vat + highfieldTotals.vat,
    gross: ownTotals.gross + highfieldTotals.gross,
  };

  const orderId = `order-${crypto.randomUUID()}`;
  const baseUrl = new URL(request.url).origin;
  let central: CentralResponse;
  try {
    central = await centralUnifiedCheckout(env, {
      brand: 'SOUSA_MURRAY_ELEARNING',
      customerNumber: profile.head_office_customer_number,
      orderReference: orderId,
      serviceReference: `${auth.session.accountId}:unified-course-basket`,
      successUrl: `${baseUrl}/basket?checkout=success&order_id=${encodeURIComponent(orderId)}&unified=1`,
      cancelUrl: `${baseUrl}/basket?checkout=cancelled`,
      items: [
        ...ownCourses.map((course) => ({ family: 'sousa_murray', courseCode: course.code })),
        ...typedHighfieldRows.map((row) => ({ family: 'highfield', courseId: row.course.id, quantity: row.quantity })),
      ],
    });
  } catch (error) {
    return Response.json({ error: 'central_checkout_failed', message: error instanceof Error ? error.message : 'Head Office Central Payments could not create the checkout.' }, { status: Number((error as { status?: number })?.status || 502) });
  }

  if (!central.checkout?.reference || !central.checkout.sessionId || !central.checkout.url) {
    return Response.json({ error: 'central_checkout_incomplete', message: 'Head Office did not return a complete Stripe Checkout session.' }, { status: 502 });
  }
  if (Number(central.checkout.amountMinor) !== expected.gross || Number(central.totals?.totalGrossMinor) !== expected.gross || Number(central.totals?.subtotalNetMinor) !== expected.net || Number(central.totals?.vatMinor) !== expected.vat) {
    return Response.json({ error: 'central_price_mismatch', message: 'Head Office returned a basket total that does not match the governed website prices. Nothing has been charged.' }, { status: 409 });
  }

  try {
    if (typedHighfieldRows.length) {
      await ensureProfessionalTrainingOrderSchema(env.DB);
      await seedProfessionalTrainingCatalogueRows(env.DB, typedHighfieldRows.map((row) => row.course));
      await createHighfieldLocalOrder(env.DB, orderId, customer, typedHighfieldRows, highfieldLearners, central.checkout.sessionId);
    }

    if (ownCourses.length) {
      const ownLearner: LearnerEnrolmentDetails = validateLearnerEnrolmentDetails({
        legalFirstName: customer.legalFirstName,
        legalLastName: customer.legalLastName,
        enrolmentEmail: customer.enrolmentEmail,
      });
      await createOwnCourseOrder(env.DB, {
        id: crypto.randomUUID(),
        accountId: auth.session.accountId,
        orderReference: orderId,
        customerNumber: profile.head_office_customer_number,
        centralPaymentReference: central.checkout.reference,
        stripeCheckoutSessionId: central.checkout.sessionId,
        subtotalNetPence: ownTotals.net,
        vatPence: ownTotals.vat,
        totalGrossPence: ownTotals.gross,
        accessDays: ownPricing.accessDays,
        learner: ownLearner,
        courses: ownCourses,
        prices: new Map(ownCourses.map((course) => {
          const price = ownPriceByCode.get(course.code)!;
          return [course.code, { netPence: Number(price.netPence), vatPence: Number(price.vatPence), grossPence: Number(price.grossPence) }];
        })),
      });
      await env.DB.prepare(`UPDATE customer_accounts SET legal_first_name=?,legal_last_name=?,customer_type=?,organisation_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(customer.legalFirstName, customer.legalLastName, customer.type, customer.organisationName, auth.session.accountId).run();
    }

    await recordLmsAudit(env.DB, request, auth.session.accountId, 'unified_course_checkout_created', 'course_order', orderId, {
      centralPaymentReference: central.checkout.reference,
      stripeCheckoutSessionId: central.checkout.sessionId,
      ownCourseSlugs: ownCourses.map((course) => course.slug),
      highfieldCourseIds: typedHighfieldRows.map((row) => row.course.id),
      highfieldLicenceCount: highfieldItems.reduce((sum, item) => sum + item.quantity, 0),
      totalGrossPence: expected.gross,
    });
  } catch (error) {
    return Response.json({ error: 'local_order_creation_failed', message: error instanceof Error ? error.message : 'The local enrolment records could not be prepared. Nothing has been charged.' }, { status: 500 });
  }

  return Response.json({
    id: central.checkout.sessionId,
    url: central.checkout.url,
    orderId,
    centralPaymentReference: central.checkout.reference,
    ownCourseCount: ownCourses.length,
    highfieldLineCount: typedHighfieldRows.length,
    highfieldLicenceCount: highfieldItems.reduce((sum, item) => sum + item.quantity, 0),
    totalGrossPence: expected.gross,
  }, { status: 201, headers: { 'Cache-Control': 'no-store', 'X-Sousa-Murray-eLearning-Payment-Architecture': 'head_office_central_payments_unified' } });
}
