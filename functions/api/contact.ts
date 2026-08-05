import { getSession, type CustomerAuthEnv } from '../_shared/customer-auth';

type ContactPayload = {
  enquiryType?: unknown;
  customerType?: unknown;
  legalFirstName?: unknown;
  legalLastName?: unknown;
  email?: unknown;
  organisationName?: unknown;
  orderReference?: unknown;
  learnerEmail?: unknown;
  reportedImpact?: unknown;
  subject?: unknown;
  message?: unknown;
  adultConfirmed?: unknown;
  privacyAccepted?: unknown;
  website?: unknown;
};

const allowedEnquiryTypes = new Set([
  'course-information',
  'large-order',
  'order-enrolment',
  'access-support',
  'technical-support',
  'billing-refund',
  'complaint',
  'data-protection',
  'accessibility',
  'other',
]);

const allowedImpacts = new Set(['general', 'minor', 'major', 'critical']);
let contactSchemaChecked = false;

function cleanText(value: unknown, maximumLength: number, minimumLength = 1) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\r\n?/g, '\n');
  if (cleaned.length < minimumLength || cleaned.length > maximumLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cleaned)) return null;
  return cleaned;
}

function optionalText(value: unknown, maximumLength: number) {
  if (value === undefined || value === null || value === '') return null;
  return cleanText(value, maximumLength);
}

function cleanEmail(value: unknown, required = true) {
  if (!required && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function referenceCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `APT-${date}-${random}`;
}

function priorityForImpact(impact: string) {
  if (impact === 'critical') return 'P1';
  if (impact === 'major') return 'P2';
  if (impact === 'minor') return 'P3';
  return 'P4';
}

async function ensureContactTable(db: D1Database) {
  if (contactSchemaChecked) return;

  const result = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM sqlite_master
    WHERE type = 'table' AND name = 'contact_requests'
  `).first<{ total: number }>();

  if (Number(result?.total ?? 0) !== 1) {
    throw new Error('Sousa Murray eLearning contact schema is incomplete.');
  }

  contactSchemaChecked = true;
}

export const onRequestPost: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) {
    return Response.json({ ok: false, error: 'contact_service_unavailable', message: 'The Sousa Murray eLearning contact service is temporarily unavailable. Email contact@jagroupservices.co.uk instead.' }, { status: 503 });
  }

  const contentType = request.headers.get('Content-Type') ?? '';
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (!contentType.includes('application/json') || contentLength > 25_000) {
    return Response.json({ ok: false, error: 'invalid_request', message: 'The contact request could not be accepted.' }, { status: 400 });
  }

  let payload: ContactPayload;
  try {
    payload = await request.json<ContactPayload>();
  } catch {
    return Response.json({ ok: false, error: 'invalid_json', message: 'The contact request could not be read.' }, { status: 400 });
  }

  // A filled honeypot is treated as accepted so automated spam does not learn the rejection rule.
  if (typeof payload.website === 'string' && payload.website.trim()) {
    return Response.json({ ok: true, reference: referenceCode(), priority: 'P4', message: 'Your enquiry has been received.' }, { status: 202 });
  }

  const enquiryType = typeof payload.enquiryType === 'string' && allowedEnquiryTypes.has(payload.enquiryType) ? payload.enquiryType : null;
  const customerType = payload.customerType === 'business' ? 'business' : payload.customerType === 'individual' ? 'individual' : null;
  const firstName = cleanText(payload.legalFirstName, 80);
  const lastName = cleanText(payload.legalLastName, 80);
  const email = cleanEmail(payload.email);
  const organisationName = optionalText(payload.organisationName, 160);
  const orderReference = optionalText(payload.orderReference, 80);
  const learnerEmail = cleanEmail(payload.learnerEmail, false);
  const reportedImpact = typeof payload.reportedImpact === 'string' && allowedImpacts.has(payload.reportedImpact) ? payload.reportedImpact : null;
  const subject = cleanText(payload.subject, 160, 3);
  const message = cleanText(payload.message, 5000, 20);

  if (
    !enquiryType
    || !customerType
    || !firstName
    || !lastName
    || !email
    || !reportedImpact
    || !subject
    || !message
    || payload.adultConfirmed !== true
    || payload.privacyAccepted !== true
    || (customerType === 'business' && !organisationName)
  ) {
    return Response.json({ ok: false, error: 'validation_failed', message: 'Complete all required contact fields and declarations before submitting.' }, { status: 400 });
  }

  try {
    await ensureContactTable(env.DB);
  } catch {
    return Response.json({ ok: false, error: 'contact_service_unavailable', message: 'The Sousa Murray eLearning contact service is temporarily unavailable. Email contact@jagroupservices.co.uk instead.' }, { status: 503 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const ipHash = await sha256(`${env.SESSION_SECRET ?? 'aptenvo-contact'}:${ip}`);
  const recent = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM contact_requests
    WHERE ip_hash = ? AND created_at >= datetime('now', '-15 minutes')
  `).bind(ipHash).first<{ total: number }>();

  if (Number(recent?.total ?? 0) >= 5) {
    return Response.json({ ok: false, error: 'rate_limited', message: 'Too many enquiries were submitted recently. Wait 15 minutes or email contact@jagroupservices.co.uk.' }, { status: 429 });
  }

  const session = await getSession(request, env);
  const reference = referenceCode();
  const priority = priorityForImpact(reportedImpact);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO contact_requests (
      id, reference, account_id, enquiry_type, customer_type,
      legal_first_name, legal_last_name, email, organisation_name,
      order_reference, learner_email, reported_impact, initial_priority,
      subject, message, adult_confirmed_at, privacy_accepted_at,
      ip_hash, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `contact-${crypto.randomUUID()}`,
    reference,
    session?.accountId ?? null,
    enquiryType,
    customerType,
    firstName,
    lastName,
    email,
    organisationName,
    orderReference,
    learnerEmail,
    reportedImpact,
    priority,
    subject,
    message,
    now,
    now,
    ipHash,
    request.headers.get('User-Agent'),
  ).run();

  return Response.json({
    ok: true,
    reference,
    priority,
    message: 'Sousa Murray eLearning has recorded your enquiry securely. Keep this reference for future contact.',
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestGet: PagesFunction = async () => Response.json({
  service: 'Sousa Murray eLearning Contact',
  status: 'ready',
  method: 'POST',
}, { headers: { 'Cache-Control': 'no-store' } });
