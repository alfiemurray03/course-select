import { catalogue, tierForQuantity } from '../../src/catalogue';

interface Env {
  DB?: D1Database;
  LEARNER_UPLOADS?: R2Bucket;
  STRIPE_SECRET_KEY?: string;
  SITE_URL?: string;
}

const ONLINE_LICENCE_LIMIT = 25;
const MAXIMUM_UPLOAD_BYTES = 10 * 1024 * 1024;
const catalogueById = new Map(catalogue.map((course) => [course.id, course]));
let operationalSchemaChecked = false;

type CheckoutItemRequest = {
  courseId?: string;
  quantity?: number;
};

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

type LearnerSubmissionRequest = {
  method?: string;
  learners?: LearnerRequest[];
};

type CheckoutRequest = {
  items?: CheckoutItemRequest[];
  customer?: CustomerRequest;
  learnerSubmission?: LearnerSubmissionRequest;
};

type CoursePriceRow = {
  position: number;
  quantity: number;
  course_id: string;
  title: string;
  slug: string;
  provider_id: string;
  tier_id: string;
  unit_net_pence: number;
  unit_vat_pence: number;
  unit_gross_pence: number;
  stripe_price_id: string | null;
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

function safeSiteUrl(request: Request, configured?: string) {
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function normaliseItems(items: CheckoutItemRequest[]) {
  const combined = new Map<string, number>();

  for (const item of items) {
    const courseId = item.courseId?.trim();
    const quantity = Number(item.quantity);
    if (!courseId || !Number.isInteger(quantity) || quantity < 1 || quantity > ONLINE_LICENCE_LIMIT) return null;
    combined.set(courseId, (combined.get(courseId) ?? 0) + quantity);
  }

  return [...combined.entries()].map(([courseId, quantity]) => ({ courseId, quantity }));
}

function priceRowsFromCode(items: { courseId: string; quantity: number }[]): CoursePriceRow[] | null {
  const rows: CoursePriceRow[] = [];

  for (const [position, item] of items.entries()) {
    const course = catalogueById.get(item.courseId);
    if (!course || course.status !== 'published') return null;
    const tier = tierForQuantity(course, item.quantity);
    if (!tier || item.quantity < tier.minQuantity || (tier.maxQuantity !== null && item.quantity > tier.maxQuantity)) return null;

    rows.push({
      position,
      quantity: item.quantity,
      course_id: course.id,
      title: course.title,
      slug: course.slug,
      provider_id: 'provider-highfield',
      tier_id: `${course.id}-tier-${tier.minQuantity}`,
      unit_net_pence: tier.aptenvoNetPence,
      unit_vat_pence: tier.vatPence,
      unit_gross_pence: tier.aptenvoGrossPence,
      stripe_price_id: null,
    });
  }

  return rows;
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
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
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
  if (customer.type === 'business' && customer.organisationName?.trim() && !organisationName) return null;

  return {
    type: customer.type,
    legalFirstName,
    legalLastName,
    enrolmentEmail,
    organisationName,
  };
}

function normaliseManualLearners(
  submission: LearnerSubmissionRequest,
  items: { courseId: string; quantity: number }[],
): ValidLearner[] | null {
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

    learners.push({
      courseId,
      position,
      legalFirstName,
      legalLastName,
      enrolmentEmail,
    });
  }

  for (const item of items) {
    for (let position = 1; position <= item.quantity; position += 1) {
      if (!positions.has(`${item.courseId}:${position}`)) return null;
    }
  }

  return learners.sort((left, right) => (
    left.courseId.localeCompare(right.courseId) || left.position - right.position
  ));
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
  const cleaned = filename
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'learner-list').slice(0, 120);
}

function fileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

async function validateLearnerFile(file: File): Promise<ValidatedUpload | null> {
  if (file.size < 1 || file.size > MAXIMUM_UPLOAD_BYTES) return null;

  const extension = fileExtension(file.name);
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
    return {
      input,
      file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null,
    };
  }

  return {
    input: await request.json<CheckoutRequest>(),
    file: null,
  };
}

async function assertOperationalSchema(db: D1Database) {
  if (operationalSchemaChecked) return;
  const result = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (
        'customers', 'learners', 'orders', 'order_items',
        'order_enrolment_details', 'order_learner_submissions',
        'order_learner_assignments', 'order_learner_uploads'
      )
  `).first<{ total: number }>();
  if (Number(result?.total ?? 0) !== 8) throw new Error('Sousa Murray eLearning operational order schema is incomplete.');
  operationalSchemaChecked = true;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return Response.json({
      error: 'database_not_bound',
      message: 'The Sousa Murray eLearning database is not connected yet. Add the D1 binding named DB.',
    }, { status: 503 });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({
      error: 'stripe_not_connected',
      message: 'Stripe checkout is ready in the code but the STRIPE_SECRET_KEY secret has not been added to Cloudflare yet.',
    }, { status: 503 });
  }

  let input: CheckoutRequest;
  let uploadedFile: File | null;
  try {
    ({ input, file: uploadedFile } = await parseRequest(request));
  } catch {
    return Response.json({ error: 'invalid_request', message: 'A valid checkout request is required.' }, { status: 400 });
  }

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > ONLINE_LICENCE_LIMIT) {
    return Response.json({
      error: 'invalid_basket',
      message: `Your online basket must contain between 1 and ${ONLINE_LICENCE_LIMIT} different courses.`,
    }, { status: 400 });
  }

  const customer = normaliseCustomer(input.customer);
  if (!customer) {
    return Response.json({
      error: 'invalid_customer_details',
      message: 'Select Individual or Business, provide valid customer details and confirm both learner-data declarations before checkout.',
    }, { status: 400 });
  }

  const items = normaliseItems(input.items);
  if (!items || items.length < 1 || items.length > ONLINE_LICENCE_LIMIT) {
    return Response.json({
      error: 'invalid_checkout_request',
      message: `Each basket item must contain a valid course and a licence quantity between 1 and ${ONLINE_LICENCE_LIMIT}.`,
    }, { status: 400 });
  }

  const totalLicences = items.reduce((total, item) => total + item.quantity, 0);
  if (totalLicences > ONLINE_LICENCE_LIMIT) {
    return Response.json({
      error: 'large_order_required',
      message: `Online checkout is limited to ${ONLINE_LICENCE_LIMIT} licences in total. Please contact Sousa Murray eLearning so we can arrange an order of ${ONLINE_LICENCE_LIMIT + 1} licences or more directly.`,
    }, { status: 400 });
  }

  const submission = input.learnerSubmission;
  if (!submission || (submission.method !== 'manual' && submission.method !== 'file')) {
    return Response.json({
      error: 'invalid_learner_submission',
      message: 'Choose whether to enter learner details manually or upload a learner list.',
    }, { status: 400 });
  }

  const manualLearners = submission.method === 'manual'
    ? normaliseManualLearners(submission, items)
    : [];
  if (submission.method === 'manual' && !manualLearners) {
    return Response.json({
      error: 'incomplete_learner_details',
      message: 'Provide one valid learner record for every course licence in the basket.',
    }, { status: 400 });
  }

  let validatedUpload: ValidatedUpload | null = null;
  if (submission.method === 'file') {
    if (!uploadedFile) {
      return Response.json({
        error: 'learner_file_required',
        message: 'Attach the learner spreadsheet or PDF before checkout.',
      }, { status: 400 });
    }
    if (!env.LEARNER_UPLOADS) {
      return Response.json({
        error: 'learner_storage_not_connected',
        message: 'Private learner-file storage has not been connected to Sousa Murray eLearning yet. Please contact Sousa Murray eLearning or enter the learner details manually.',
      }, { status: 503 });
    }
    validatedUpload = await validateLearnerFile(uploadedFile);
    if (!validatedUpload) {
      return Response.json({
        error: 'invalid_learner_file',
        message: 'Upload a genuine CSV, XLS, XLSX or PDF file no larger than 10 MB.',
      }, { status: 400 });
    }
  }

  const rows = priceRowsFromCode(items);
  if (!rows || rows.length !== items.length) {
    return Response.json({
      error: 'course_or_price_not_found',
      message: 'One or more selected courses or quantity prices could not be found. Please review your basket.',
    }, { status: 404 });
  }

  try {
    await assertOperationalSchema(env.DB);
  } catch {
    return Response.json({
      error: 'order_schema_unavailable',
      message: 'Sousa Murray eLearning checkout is temporarily unavailable while the operational database is being prepared.',
    }, { status: 503 });
  }

  const orderId = `order-${crypto.randomUUID()}`;
  const customerId = await identityId('customer', customer.enrolmentEmail);
  const customerAccountType = customer.type === 'business' ? 'organisation' : 'individual';
  const orderItems = rows.map((row) => ({ row, id: `order-item-${crypto.randomUUID()}` }));
  const orderItemByCourse = new Map(orderItems.map((item) => [item.row.course_id, item.id]));
  const uniqueLearners = new Map<string, ValidLearner>();
  for (const learner of manualLearners ?? []) uniqueLearners.set(learner.enrolmentEmail, learner);

  const learnerIdByEmail = new Map<string, string>();
  await Promise.all([...uniqueLearners.keys()].map(async (email) => {
    learnerIdByEmail.set(email, await identityId('learner', email));
  }));

  const primaryLearnerId = manualLearners?.[0]
    ? learnerIdByEmail.get(manualLearners[0].enrolmentEmail) ?? null
    : null;
  const totals = rows.reduce((sum, row) => ({
    net: sum.net + row.unit_net_pence * row.quantity,
    vat: sum.vat + row.unit_vat_pence * row.quantity,
    gross: sum.gross + row.unit_gross_pence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 });

  let uploadedStorageKey: string | null = null;
  let uploadId: string | null = null;
  if (validatedUpload && env.LEARNER_UPLOADS) {
    uploadId = `learner-upload-${crypto.randomUUID()}`;
    uploadedStorageKey = `orders/${orderId}/learner-lists/${crypto.randomUUID()}-${validatedUpload.safeFilename}`;
    try {
      await env.LEARNER_UPLOADS.put(uploadedStorageKey, validatedUpload.bytes, {
        httpMetadata: { contentType: validatedUpload.contentType },
        customMetadata: {
          classification: 'learner-enrolment-information',
          orderId,
          uploadId,
        },
      });
    } catch {
      return Response.json({
        error: 'learner_upload_failed',
        message: 'The learner file could not be stored securely. Please try again or enter the learner details manually.',
      }, { status: 502 });
    }
  }

  const orderStatements: D1PreparedStatement[] = [
    env.DB.prepare(`
      INSERT INTO customers (id, email, first_name, last_name, account_type, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        account_type = excluded.account_type,
        updated_at = CURRENT_TIMESTAMP
      WHERE customers.email IS NOT excluded.email
         OR customers.first_name IS NOT excluded.first_name
         OR customers.last_name IS NOT excluded.last_name
         OR customers.account_type IS NOT excluded.account_type
         OR customers.status IS NOT 'active'
    `).bind(
      customerId,
      customer.enrolmentEmail,
      customer.legalFirstName,
      customer.legalLastName,
      customerAccountType,
    ),
    ...[...uniqueLearners.entries()].map(([email, learner]) => env.DB!.prepare(`
      INSERT INTO learners (id, customer_id, email, first_name, last_name, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(id) DO UPDATE SET
        customer_id = COALESCE(learners.customer_id, excluded.customer_id),
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE learners.customer_id IS NOT COALESCE(learners.customer_id, excluded.customer_id)
         OR learners.email IS NOT excluded.email
         OR learners.first_name IS NOT excluded.first_name
         OR learners.last_name IS NOT excluded.last_name
         OR learners.status IS NOT 'active'
    `).bind(
      learnerIdByEmail.get(email),
      email === customer.enrolmentEmail ? customerId : null,
      email,
      learner.legalFirstName,
      learner.legalLastName,
    )),
    env.DB.prepare(`
      INSERT INTO orders (
        id, customer_id, status, currency, subtotal_pence, vat_pence, total_pence, customer_email
      ) VALUES (?, ?, 'awaiting_payment', 'GBP', ?, ?, ?, ?)
    `).bind(orderId, customerId, totals.net, totals.vat, totals.gross, customer.enrolmentEmail),
    env.DB.prepare(`
      INSERT INTO order_enrolment_details (
        order_id, customer_type, legal_first_name, legal_last_name,
        enrolment_email, organisation_name, learner_id,
        provider_sharing_consent, consent_recorded_at,
        additional_learner_details_required, fulfilment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, 'pending_payment')
    `).bind(
      orderId,
      customer.type,
      customer.legalFirstName,
      customer.legalLastName,
      customer.enrolmentEmail,
      customer.organisationName,
      primaryLearnerId,
      submission.method === 'file' ? 1 : 0,
    ),
    env.DB.prepare(`
      INSERT INTO order_learner_submissions (
        order_id, method, expected_learner_count, submitted_learner_count,
        authority_confirmed, status
      ) VALUES (?, ?, ?, ?, 1, 'pending_payment')
    `).bind(
      orderId,
      submission.method,
      totalLicences,
      submission.method === 'manual' ? totalLicences : 0,
    ),
    ...orderItems.map(({ row, id }) => {
      const lineNetPence = row.unit_net_pence * row.quantity;
      const lineVatPence = row.unit_vat_pence * row.quantity;
      const lineGrossPence = row.unit_gross_pence * row.quantity;
      return env.DB!.prepare(`
        INSERT INTO order_items (
          id, order_id, course_id, price_tier_id, quantity,
          unit_net_pence, unit_vat_pence, unit_gross_pence,
          line_net_pence, line_vat_pence, line_gross_pence,
          fulfilment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started')
      `).bind(
        id,
        orderId,
        row.course_id,
        row.tier_id,
        row.quantity,
        row.unit_net_pence,
        row.unit_vat_pence,
        row.unit_gross_pence,
        lineNetPence,
        lineVatPence,
        lineGrossPence,
      );
    }),
    ...(manualLearners ?? []).map((learner) => env.DB!.prepare(`
      INSERT INTO order_learner_assignments (
        id, order_id, order_item_id, course_id, learner_id, position,
        legal_first_name, legal_last_name, enrolment_email, source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'pending_payment')
    `).bind(
      `learner-assignment-${crypto.randomUUID()}`,
      orderId,
      orderItemByCourse.get(learner.courseId),
      learner.courseId,
      learnerIdByEmail.get(learner.enrolmentEmail),
      learner.position,
      learner.legalFirstName,
      learner.legalLastName,
      learner.enrolmentEmail,
    )),
  ];

  if (validatedUpload && uploadId && uploadedStorageKey) {
    orderStatements.push(env.DB.prepare(`
      INSERT INTO order_learner_uploads (
        id, order_id, storage_key, original_filename, content_type,
        size_bytes, sha256, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment')
    `).bind(
      uploadId,
      orderId,
      uploadedStorageKey,
      validatedUpload.originalFilename,
      validatedUpload.contentType,
      validatedUpload.size,
      validatedUpload.sha256,
    ));
  }

  try {
    await env.DB.batch(orderStatements);
  } catch (error) {
    if (uploadedStorageKey && env.LEARNER_UPLOADS) await env.LEARNER_UPLOADS.delete(uploadedStorageKey).catch(() => undefined);
    return Response.json({
      error: 'order_creation_failed',
      message: 'Sousa Murray eLearning could not save the order and learner information. Nothing has been charged.',
      detail: error instanceof Error ? error.message : undefined,
    }, { status: 500 });
  }

  const siteUrl = safeSiteUrl(request, env.SITE_URL);
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${siteUrl}/basket?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${siteUrl}/basket?checkout=cancelled`);
  form.set('customer_creation', 'always');
  form.set('customer_email', customer.enrolmentEmail);
  form.set('billing_address_collection', 'auto');
  form.set('client_reference_id', orderId);
  form.set('metadata[aptenvo_order_id]', orderId);
  form.set('metadata[customer_type]', customer.type);
  form.set('metadata[learner_submission_method]', submission.method);
  form.set('metadata[basket_item_count]', String(rows.length));
  form.set('metadata[licence_count]', String(totalLicences));
  form.set('payment_intent_data[metadata][aptenvo_order_id]', orderId);

  rows.forEach((row, index) => {
    form.set(`line_items[${index}][price_data][currency]`, 'gbp');
    form.set(`line_items[${index}][price_data][unit_amount]`, String(row.unit_gross_pence));
    form.set(`line_items[${index}][price_data][tax_behavior]`, 'inclusive');
    form.set(`line_items[${index}][price_data][product_data][name]`, row.title);
    form.set(`line_items[${index}][price_data][product_data][description]`, 'Online training licence sold by JA Group Services Ltd through Sousa Murray eLearning and delivered through the course provider learning platform. Price includes VAT.');
    form.set(`line_items[${index}][price_data][product_data][metadata][course_id]`, row.course_id);
    form.set(`line_items[${index}][price_data][product_data][metadata][provider_id]`, row.provider_id);
    form.set(`line_items[${index}][quantity]`, String(row.quantity));
  });

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  const stripeData = await stripeResponse.json() as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!stripeResponse.ok || !stripeData.id || !stripeData.url) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(orderId),
      env.DB.prepare(`UPDATE order_enrolment_details SET fulfilment_status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`).bind(orderId),
      env.DB.prepare(`UPDATE order_learner_submissions SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`).bind(orderId),
      env.DB.prepare(`UPDATE order_learner_assignments SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`).bind(orderId),
      env.DB.prepare(`UPDATE order_learner_uploads SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`).bind(orderId),
    ]);
    if (uploadedStorageKey && env.LEARNER_UPLOADS) await env.LEARNER_UPLOADS.delete(uploadedStorageKey).catch(() => undefined);

    return Response.json({
      error: 'stripe_checkout_failed',
      message: stripeData.error?.message ?? 'Stripe was unable to create the checkout session.',
    }, { status: 502 });
  }

  await env.DB.prepare(`
    UPDATE orders
    SET stripe_checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(stripeData.id, orderId).run();

  return Response.json({
    id: stripeData.id,
    url: stripeData.url,
    orderId,
    itemCount: rows.length,
    licenceCount: totalLicences,
    learnerSubmissionMethod: submission.method,
  }, { headers: { 'Cache-Control': 'no-store', 'X-Sousa Murray eLearning-Catalogue-Source': 'code' } });
};