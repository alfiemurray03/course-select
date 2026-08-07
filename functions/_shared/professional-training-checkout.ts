import { catalogue, tierForQuantity } from '../../src/catalogue';
import {
  synchroniseElearningCustomer,
  type CentralPaymentsEnv,
} from './central-payments';
import { requireProductionLms } from './production-lms';
import {
  ensureProfessionalTrainingOrderSchema,
  markProfessionalTrainingOrderFailed,
  seedProfessionalTrainingCatalogueRows,
} from './professional-training-orders';

export type ProfessionalTrainingEnv = CentralPaymentsEnv & {
  LEARNER_UPLOADS?: R2Bucket;
};

const ONLINE_LICENCE_LIMIT = 25;
const MAXIMUM_UPLOAD_BYTES = 10 * 1024 * 1024;
const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';
const catalogueById = new Map(catalogue.map((course) => [course.id, course]));

type CheckoutItemRequest = { courseId?: string; quantity?: number };
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
type LearnerSubmissionRequest = { method?: string; learners?: LearnerRequest[] };
type CheckoutRequest = {
  items?: CheckoutItemRequest[];
  customer?: CustomerRequest;
  learnerSubmission?: LearnerSubmissionRequest;
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
type ValidatedUpload = {
  bytes: ArrayBuffer;
  originalFilename: string;
  safeFilename: string;
  contentType: string;
  size: number;
  sha256: string;
};

type CentralBasketResponse = {
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
    licenceCount?: number;
  };
};

function safeSiteUrl(request: Request, configured?: string) {
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

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

function normaliseItems(items: CheckoutItemRequest[]) {
  const combined = new Map<string, number>();
  for (const item of items) {
    const courseId = item.courseId?.trim();
    const quantity = Number(item.quantity);
    if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > ONLINE_LICENCE_LIMIT) return null;
    combined.set(courseId, (combined.get(courseId) ?? 0) + quantity);
  }
  if ([...combined.values()].some((quantity) => quantity > ONLINE_LICENCE_LIMIT)) return null;
  return [...combined.entries()].map(([courseId, quantity]) => ({ courseId, quantity }));
}

function normaliseCustomer(customer?: CustomerRequest): ValidCustomer | null {
  if (!customer || (customer.type !== 'individual' && customer.type !== 'business')) return null;
  if (customer.providerConsent !== true || customer.authorityConfirmed !== true) return null;
  const legalFirstName = cleanText(customer.legalFirstName, 80);
  const legalLastName = cleanText(customer.legalLastName, 80);
  const enrolmentEmail = normaliseEmail(customer.enrolmentEmail);
  const organisationName = typeof customer.organisationName === 'string' && customer.organisationName.trim()
    ? cleanText(customer.organisationName, 160)
    : null;
  if (!legalFirstName || !legalLastName || !enrolmentEmail) return null;
  return { type: customer.type, legalFirstName, legalLastName, enrolmentEmail, organisationName };
}

function normaliseManualLearners(submission: LearnerSubmissionRequest, items: { courseId: string; quantity: number }[]) {
  if (submission.method !== 'manual' || !Array.isArray(submission.learners)) return null;
  const expectedByCourse = new Map(items.map((item) => [item.courseId, item.quantity]));
  const expectedTotal = items.reduce((total, item) => total + item.quantity, 0);
  if (submission.learners.length !== expectedTotal) return null;
  const positions = new Set<string>();
  const identityByEmail = new Map<string, string>();
  const learners: ValidLearner[] = [];
  for (const learner of submission.learners) {
    const courseId = typeof learner.courseId === 'string' ? learner.courseId.trim() : '';
    const position = Number(learner.position);
    const maximumPosition = expectedByCourse.get(courseId);
    const legalFirstName = cleanText(learner.legalFirstName, 80);
    const legalLastName = cleanText(learner.legalLastName, 80);
    const enrolmentEmail = normaliseEmail(learner.enrolmentEmail);
    if (!maximumPosition || !Number.isInteger(position) || position < 1 || position > maximumPosition) return null;
    if (!legalFirstName || !legalLastName || !enrolmentEmail) return null;
    const positionKey = `${courseId}:${position}`;
    if (positions.has(positionKey)) return null;
    positions.add(positionKey);
    const identity = `${legalFirstName.toLowerCase()}\u0000${legalLastName.toLowerCase()}`;
    const existingIdentity = identityByEmail.get(enrolmentEmail);
    if (existingIdentity && existingIdentity !== identity) return null;
    identityByEmail.set(enrolmentEmail, identity);
    learners.push({ courseId, position, legalFirstName, legalLastName, enrolmentEmail });
  }
  for (const item of items) {
    for (let position = 1; position <= item.quantity; position += 1) {
      if (!positions.has(`${item.courseId}:${position}`)) return null;
    }
  }
  return learners.sort((left, right) => left.courseId.localeCompare(right.courseId) || left.position - right.position);
}

async function sha256Hex(value: ArrayBuffer | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function identityId(prefix: string, value: string) {
  return `${prefix}-${(await sha256Hex(value)).slice(0, 40)}`;
}

function safeFilename(filename: string) {
  const cleaned = filename.replace(/[\\/]/g, '-').replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim();
  return (cleaned || 'learner-list').slice(0, 120);
}

async function validateLearnerFile(file: File): Promise<ValidatedUpload | null> {
  if (file.size < 1 || file.size > MAXIMUM_UPLOAD_BYTES) return null;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!['csv', 'xls', 'xlsx', 'pdf'].includes(extension)) return null;
  const bytes = await file.arrayBuffer();
  const header = new Uint8Array(bytes.slice(0, 16));
  let contentType = '';
  if (extension === 'pdf') {
    if (new TextDecoder().decode(header.slice(0, 5)) !== '%PDF-') return null;
    contentType = 'application/pdf';
  } else if (extension === 'xlsx') {
    if (header[0] !== 0x50 || header[1] !== 0x4b) return null;
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (extension === 'xls') {
    const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (!signature.every((value, index) => header[index] === value)) return null;
    contentType = 'application/vnd.ms-excel';
  } else {
    const sample = new Uint8Array(bytes.slice(0, Math.min(bytes.byteLength, 4096)));
    if (sample.some((byte) => byte === 0)) return null;
    contentType = 'text/csv; charset=utf-8';
  }
  return {
    bytes,
    originalFilename: file.name.slice(0, 255),
    safeFilename: safeFilename(file.name),
    contentType,
    size: file.size,
    sha256: await sha256Hex(bytes),
  };
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.toLowerCase().includes('multipart/form-data')) {
    const form = await request.formData();
    const payload = form.get('payload');
    if (typeof payload !== 'string') throw new Error('missing_payload');
    const input = JSON.parse(payload) as CheckoutRequest;
    const fileValue = form.get('learnerFile');
    return { input, file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null };
  }
  return { input: await request.json<CheckoutRequest>(), file: null };
}

async function headOfficeBasketCheckout(env: ProfessionalTrainingEnv, body: Record<string, unknown>) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  if (!token) throw new Error('The Head Office Central Payments connection is not configured.');
  const response = await fetch(`${base}/api/v1/payments/basket-checkout`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error && typeof data.error === 'object' ? data.error as Record<string, unknown> : null;
    throw new Error(typeof detail?.message === 'string' ? detail.message : `Head Office Central Payments returned HTTP ${response.status}.`);
  }
  return data as CentralBasketResponse;
}

export async function handleProfessionalTrainingCheckout(request: Request, env: ProfessionalTrainingEnv) {
  if (!env.DB) return Response.json({ error: 'database_not_bound', message: 'The Sousa Murray eLearning database is not connected.' }, { status: 503 });

  const auth = await requireProductionLms(request, env);
  if (auth.response || !auth.session || !auth.profile) {
    return auth.response ?? Response.json({ error: 'sign_in_required', message: 'Sign in with JA Group Services ID before proceeding to payment.' }, { status: 401 });
  }

  let input: CheckoutRequest;
  let uploadedFile: File | null;
  try { ({ input, file: uploadedFile } = await parseRequest(request)); }
  catch { return Response.json({ error: 'invalid_request', message: 'A valid checkout request is required.' }, { status: 400 }); }

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > ONLINE_LICENCE_LIMIT) {
    return Response.json({ error: 'invalid_basket', message: `Your online basket must contain between 1 and ${ONLINE_LICENCE_LIMIT} different courses.` }, { status: 400 });
  }
  const customer = normaliseCustomer(input.customer);
  if (!customer) return Response.json({ error: 'invalid_customer_details', message: 'Provide valid customer details and confirm both learner-data declarations before checkout.' }, { status: 400 });
  const items = normaliseItems(input.items);
  if (!items?.length) return Response.json({ error: 'invalid_checkout_request', message: 'Each basket item must contain a valid course and quantity.' }, { status: 400 });
  const totalLicences = items.reduce((total, item) => total + item.quantity, 0);
  if (totalLicences > ONLINE_LICENCE_LIMIT) {
    return Response.json({ error: 'large_order_required', message: `Online checkout is limited to ${ONLINE_LICENCE_LIMIT} licences in total. Please contact Sousa Murray eLearning for larger orders.` }, { status: 400 });
  }

  const submission = input.learnerSubmission;
  if (!submission || (submission.method !== 'manual' && submission.method !== 'file')) {
    return Response.json({ error: 'invalid_learner_submission', message: 'Choose whether to enter learner details manually or upload a learner list.' }, { status: 400 });
  }
  const manualLearners = submission.method === 'manual' ? normaliseManualLearners(submission, items) : [];
  if (submission.method === 'manual' && !manualLearners) {
    return Response.json({ error: 'incomplete_learner_details', message: 'Provide one valid learner record for every course licence in the basket.' }, { status: 400 });
  }

  let validatedUpload: ValidatedUpload | null = null;
  if (submission.method === 'file') {
    if (!uploadedFile) return Response.json({ error: 'learner_file_required', message: 'Attach the learner spreadsheet or PDF before checkout.' }, { status: 400 });
    if (!env.LEARNER_UPLOADS) return Response.json({ error: 'learner_storage_not_connected', message: 'Private learner-file storage is not connected.' }, { status: 503 });
    validatedUpload = await validateLearnerFile(uploadedFile);
    if (!validatedUpload) return Response.json({ error: 'invalid_learner_file', message: 'Upload a genuine CSV, XLS, XLSX or PDF file no larger than 10 MB.' }, { status: 400 });
  }

  const selectedCourses = items.map((item) => catalogueById.get(item.courseId)).filter(Boolean);
  if (selectedCourses.length !== items.length) {
    return Response.json({ error: 'course_or_price_not_found', message: 'One or more selected courses could not be found.' }, { status: 404 });
  }
  const rows = items.map((item) => {
    const course = catalogueById.get(item.courseId)!;
    const tier = tierForQuantity(course, item.quantity);
    return {
      quantity: item.quantity,
      course,
      tier,
      tierId: `${course.id}-tier-${tier.minQuantity}`,
    };
  });
  const totals = rows.reduce((sum, row) => ({
    net: sum.net + row.tier.aptenvoNetPence * row.quantity,
    vat: sum.vat + row.tier.vatPence * row.quantity,
    gross: sum.gross + row.tier.aptenvoGrossPence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 });

  try {
    await ensureProfessionalTrainingOrderSchema(env.DB);
    await seedProfessionalTrainingCatalogueRows(env.DB, selectedCourses as typeof catalogue);
  } catch (error) {
    return Response.json({
      error: 'order_schema_initialisation_failed',
      message: 'Sousa Murray eLearning could not prepare the operational order database.',
      detail: error instanceof Error ? error.message : undefined,
    }, { status: 503 });
  }

  let centralProfile;
  try { centralProfile = await synchroniseElearningCustomer(env, env.DB, auth.session, auth.profile); }
  catch (error) {
    return Response.json({ error: 'customer_reconciliation_failed', message: error instanceof Error ? error.message : 'Head Office could not reconcile the customer.' }, { status: 409 });
  }

  const orderId = `order-${crypto.randomUUID()}`;
  const customerId = await identityId('customer', customer.enrolmentEmail);
  const customerAccountType = customer.type === 'business' ? 'organisation' : 'individual';
  const orderItems = rows.map((row) => ({ row, id: `order-item-${crypto.randomUUID()}` }));
  const orderItemByCourse = new Map(orderItems.map((item) => [item.row.course.id, item.id]));
  const uniqueLearners = new Map<string, ValidLearner>();
  for (const learner of manualLearners ?? []) uniqueLearners.set(learner.enrolmentEmail, learner);
  const learnerIdByEmail = new Map<string, string>();
  await Promise.all([...uniqueLearners.keys()].map(async (email) => learnerIdByEmail.set(email, await identityId('learner', email))));
  const primaryLearnerId = manualLearners?.[0] ? learnerIdByEmail.get(manualLearners[0].enrolmentEmail) ?? null : null;

  let uploadedStorageKey: string | null = null;
  let uploadId: string | null = null;
  if (validatedUpload && env.LEARNER_UPLOADS) {
    uploadId = `learner-upload-${crypto.randomUUID()}`;
    uploadedStorageKey = `orders/${orderId}/learner-lists/${crypto.randomUUID()}-${validatedUpload.safeFilename}`;
    try {
      await env.LEARNER_UPLOADS.put(uploadedStorageKey, validatedUpload.bytes, {
        httpMetadata: { contentType: validatedUpload.contentType },
        customMetadata: { classification: 'learner-enrolment-information', orderId, uploadId },
      });
    } catch {
      return Response.json({ error: 'learner_upload_failed', message: 'The learner file could not be stored securely.' }, { status: 502 });
    }
  }

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO customers (id,email,first_name,last_name,account_type,status)
      VALUES (?,?,?,?,?,'active') ON CONFLICT(id) DO UPDATE SET email=excluded.email,first_name=excluded.first_name,
      last_name=excluded.last_name,account_type=excluded.account_type,status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(customerId, customer.enrolmentEmail, customer.legalFirstName, customer.legalLastName, customerAccountType),
    ...[...uniqueLearners.entries()].map(([email, learner]) => env.DB!.prepare(`INSERT INTO learners
      (id,customer_id,email,first_name,last_name,status) VALUES (?,?,?,?,?,'active')
      ON CONFLICT(id) DO UPDATE SET customer_id=COALESCE(learners.customer_id,excluded.customer_id),email=excluded.email,
      first_name=excluded.first_name,last_name=excluded.last_name,status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(learnerIdByEmail.get(email), email === customer.enrolmentEmail ? customerId : null, email, learner.legalFirstName, learner.legalLastName)),
    env.DB.prepare(`INSERT INTO orders (id,customer_id,status,currency,subtotal_pence,vat_pence,total_pence,customer_email)
      VALUES (?,?,'awaiting_payment','GBP',?,?,?,?)`).bind(orderId, customerId, totals.net, totals.vat, totals.gross, customer.enrolmentEmail),
    env.DB.prepare(`INSERT INTO order_enrolment_details
      (order_id,customer_type,legal_first_name,legal_last_name,enrolment_email,organisation_name,learner_id,
       provider_sharing_consent,consent_recorded_at,additional_learner_details_required,fulfilment_status)
      VALUES (?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP,?,'pending_payment')`)
      .bind(orderId, customer.type, customer.legalFirstName, customer.legalLastName, customer.enrolmentEmail,
        customer.organisationName, primaryLearnerId, submission.method === 'file' ? 1 : 0),
    env.DB.prepare(`INSERT INTO order_learner_submissions
      (order_id,method,expected_learner_count,submitted_learner_count,authority_confirmed,status)
      VALUES (?,?,?,?,1,'pending_payment')`)
      .bind(orderId, submission.method, totalLicences, submission.method === 'manual' ? totalLicences : 0),
    ...orderItems.map(({ row, id }) => env.DB!.prepare(`INSERT INTO order_items
      (id,order_id,course_id,price_tier_id,quantity,unit_net_pence,unit_vat_pence,unit_gross_pence,line_net_pence,line_vat_pence,line_gross_pence,fulfilment_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'not_started')`)
      .bind(id, orderId, row.course.id, row.tierId, row.quantity, row.tier.aptenvoNetPence, row.tier.vatPence,
        row.tier.aptenvoGrossPence, row.tier.aptenvoNetPence * row.quantity, row.tier.vatPence * row.quantity,
        row.tier.aptenvoGrossPence * row.quantity)),
    ...(manualLearners ?? []).map((learner) => env.DB!.prepare(`INSERT INTO order_learner_assignments
      (id,order_id,order_item_id,course_id,learner_id,position,legal_first_name,legal_last_name,enrolment_email,source,status)
      VALUES (?,?,?,?,?,?,?,?,?,'manual','pending_payment')`)
      .bind(`learner-assignment-${crypto.randomUUID()}`, orderId, orderItemByCourse.get(learner.courseId), learner.courseId,
        learnerIdByEmail.get(learner.enrolmentEmail), learner.position, learner.legalFirstName, learner.legalLastName, learner.enrolmentEmail)),
  ];
  if (validatedUpload && uploadId && uploadedStorageKey) {
    statements.push(env.DB.prepare(`INSERT INTO order_learner_uploads
      (id,order_id,storage_key,original_filename,content_type,size_bytes,sha256,status)
      VALUES (?,?,?,?,?,?,?,'pending_payment')`)
      .bind(uploadId, orderId, uploadedStorageKey, validatedUpload.originalFilename, validatedUpload.contentType, validatedUpload.size, validatedUpload.sha256));
  }

  try { await env.DB.batch(statements); }
  catch (error) {
    if (uploadedStorageKey && env.LEARNER_UPLOADS) await env.LEARNER_UPLOADS.delete(uploadedStorageKey).catch(() => undefined);
    return Response.json({ error: 'order_creation_failed', message: 'Sousa Murray eLearning could not save the order and learner information. Nothing has been charged.', detail: error instanceof Error ? error.message : undefined }, { status: 500 });
  }

  const siteUrl = safeSiteUrl(request, env.SITE_URL);
  let central;
  try {
    central = await headOfficeBasketCheckout(env, {
      brand: 'SOUSA_MURRAY_ELEARNING',
      customerNumber: centralProfile.head_office_customer_number,
      orderReference: orderId,
      serviceReference: `professional_training:${submission.method}`,
      successUrl: `${siteUrl}/basket?checkout=success&order_id=${encodeURIComponent(orderId)}`,
      cancelUrl: `${siteUrl}/basket?checkout=cancelled&order_id=${encodeURIComponent(orderId)}`,
      items: rows.map((row) => ({ courseId: row.course.id, quantity: row.quantity })),
    });
  } catch (error) {
    await markProfessionalTrainingOrderFailed(env.DB, orderId, 'failed').catch(() => undefined);
    if (uploadedStorageKey && env.LEARNER_UPLOADS) await env.LEARNER_UPLOADS.delete(uploadedStorageKey).catch(() => undefined);
    return Response.json({ error: 'central_checkout_failed', message: error instanceof Error ? error.message : 'Head Office Central Payments could not create checkout.' }, { status: 502 });
  }

  if (!central.checkout?.sessionId || !central.checkout.url) {
    await markProfessionalTrainingOrderFailed(env.DB, orderId, 'failed').catch(() => undefined);
    return Response.json({ error: 'central_checkout_incomplete', message: 'Head Office did not return a complete secure checkout session.' }, { status: 502 });
  }
  if (Number(central.totals?.subtotalNetMinor) !== totals.net || Number(central.totals?.vatMinor) !== totals.vat || Number(central.totals?.totalGrossMinor) !== totals.gross) {
    await markProfessionalTrainingOrderFailed(env.DB, orderId, 'failed').catch(() => undefined);
    return Response.json({ error: 'central_price_mismatch', message: 'Head Office rejected the basket because the governed price did not match the website catalogue. Nothing has been charged.' }, { status: 409 });
  }

  await env.DB.prepare(`UPDATE orders SET stripe_checkout_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(central.checkout.sessionId, orderId).run();

  return Response.json({
    id: central.checkout.sessionId,
    url: central.checkout.url,
    orderId,
    centralPaymentReference: central.checkout.reference,
    itemCount: rows.length,
    licenceCount: totalLicences,
    learnerSubmissionMethod: submission.method,
  }, { headers: { 'Cache-Control': 'no-store', 'X-Sousa-Murray-eLearning-Payment-Architecture': 'head_office_central_payments' } });
}
