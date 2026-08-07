import type { Course } from '../../src/catalogue';

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    legal_name TEXT,
    provider_type TEXT NOT NULL DEFAULT 'third_party',
    fulfilment_method TEXT NOT NULL DEFAULT 'manual',
    website_url TEXT,
    support_email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    provider_course_id TEXT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL,
    level TEXT NOT NULL,
    course_type TEXT NOT NULL,
    short_description TEXT NOT NULL,
    overview TEXT NOT NULL,
    audience TEXT NOT NULL,
    delivery_text TEXT NOT NULL,
    certificate_text TEXT NOT NULL,
    qualification_notice TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    vat_rate_basis_points INTEGER NOT NULL DEFAULT 2000,
    markup_basis_points INTEGER NOT NULL DEFAULT 3000,
    featured INTEGER NOT NULL DEFAULT 0,
    price_verified INTEGER NOT NULL DEFAULT 0,
    price_source TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS course_price_tiers (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    minimum_quantity INTEGER NOT NULL,
    maximum_quantity INTEGER,
    provider_retail_pence INTEGER NOT NULL,
    aptenvo_net_pence INTEGER NOT NULL,
    vat_pence INTEGER NOT NULL,
    aptenvo_gross_pence INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    effective_from TEXT,
    effective_to TEXT,
    verified_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id,minimum_quantity)
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    external_identity_id TEXT UNIQUE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    telephone TEXT,
    account_type TEXT NOT NULL DEFAULT 'individual',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS learners (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    organisation_id TEXT,
    provider_learner_id TEXT,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    organisation_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    currency TEXT NOT NULL DEFAULT 'GBP',
    subtotal_pence INTEGER NOT NULL DEFAULT 0,
    vat_pence INTEGER NOT NULL DEFAULT 0,
    total_pence INTEGER NOT NULL DEFAULT 0,
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    stripe_customer_id TEXT,
    customer_email TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    price_tier_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_net_pence INTEGER NOT NULL,
    unit_vat_pence INTEGER NOT NULL,
    unit_gross_pence INTEGER NOT NULL,
    line_net_pence INTEGER NOT NULL,
    line_vat_pence INTEGER NOT NULL,
    line_gross_pence INTEGER NOT NULL,
    fulfilment_status TEXT NOT NULL DEFAULT 'not_started',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_enrolment_details (
    order_id TEXT PRIMARY KEY,
    customer_type TEXT NOT NULL,
    legal_first_name TEXT NOT NULL,
    legal_last_name TEXT NOT NULL,
    enrolment_email TEXT NOT NULL,
    organisation_name TEXT,
    learner_id TEXT,
    provider_sharing_consent INTEGER NOT NULL DEFAULT 0,
    consent_recorded_at TEXT,
    additional_learner_details_required INTEGER NOT NULL DEFAULT 0,
    fulfilment_status TEXT NOT NULL DEFAULT 'pending_payment',
    ready_for_enrolment_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_learner_submissions (
    order_id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    expected_learner_count INTEGER NOT NULL,
    submitted_learner_count INTEGER NOT NULL DEFAULT 0,
    authority_confirmed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_learner_assignments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_item_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    learner_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    legal_first_name TEXT NOT NULL,
    legal_last_name TEXT NOT NULL,
    enrolment_email TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'pending_payment',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_item_id,position)
  )`,
  `CREATE TABLE IF NOT EXISTS order_learner_uploads (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'received',
    error_message TEXT,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,
    UNIQUE(source,external_event_id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_external_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_learner_assignments_order ON order_learner_assignments(order_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_order_learner_uploads_order ON order_learner_uploads(order_id,status)`,
];

function categorySlug(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function initialise(db: D1Database) {
  for (const statement of SCHEMA) await db.prepare(statement).run();
  schemaReady = true;
}

export async function ensureProfessionalTrainingOrderSchema(db: D1Database) {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = initialise(db).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function seedProfessionalTrainingCatalogueRows(db: D1Database, courses: Course[]) {
  await ensureProfessionalTrainingOrderSchema(db);
  const provider = db.prepare(`INSERT INTO providers
    (id,name,slug,legal_name,provider_type,fulfilment_method,status,metadata_json)
    VALUES ('provider-highfield','Highfield e-learning','highfield-e-learning','Highfield Qualifications','third_party','manual','active','{}')
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,status='active',updated_at=CURRENT_TIMESTAMP`);
  const statements: D1PreparedStatement[] = [provider];

  for (const course of courses) {
    const categoryId = `category-${categorySlug(course.category)}`;
    statements.push(db.prepare(`INSERT INTO categories (id,name,slug,status)
      VALUES (?,?,?,'active') ON CONFLICT(id) DO UPDATE SET name=excluded.name,status='active',updated_at=CURRENT_TIMESTAMP`)
      .bind(categoryId, course.category, categorySlug(course.category)));
    statements.push(db.prepare(`INSERT INTO courses (
      id,provider_id,provider_course_id,title,slug,category_id,level,course_type,short_description,overview,audience,
      delivery_text,certificate_text,qualification_notice,currency,vat_rate_basis_points,markup_basis_points,featured,
      price_verified,price_source,status,metadata_json
    ) VALUES (?,'provider-highfield',?,?,?,?,?,?,?,?,?,?,?,?,'GBP',2000,3000,?,0,?,'published','{}')
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,slug=excluded.slug,category_id=excluded.category_id,level=excluded.level,
      course_type=excluded.course_type,short_description=excluded.short_description,overview=excluded.overview,audience=excluded.audience,
      delivery_text=excluded.delivery_text,certificate_text=excluded.certificate_text,qualification_notice=excluded.qualification_notice,
      featured=excluded.featured,price_source=excluded.price_source,status='published',updated_at=CURRENT_TIMESTAMP`)
      .bind(course.id, course.providerCourseId, course.title, course.slug, categoryId, course.level, course.courseType,
        course.shortDescription, course.overview, course.audience, course.delivery, course.certificate, course.qualificationNotice,
        course.featured ? 1 : 0, course.priceSource));
    for (const tier of course.pricingTiers) {
      statements.push(db.prepare(`INSERT INTO course_price_tiers (
        id,course_id,minimum_quantity,maximum_quantity,provider_retail_pence,aptenvo_net_pence,vat_pence,aptenvo_gross_pence,currency,status
      ) VALUES (?,?,?,?,?,?,?,?,'GBP','active')
      ON CONFLICT(course_id,minimum_quantity) DO UPDATE SET maximum_quantity=excluded.maximum_quantity,
        provider_retail_pence=excluded.provider_retail_pence,aptenvo_net_pence=excluded.aptenvo_net_pence,
        vat_pence=excluded.vat_pence,aptenvo_gross_pence=excluded.aptenvo_gross_pence,status='active',updated_at=CURRENT_TIMESTAMP`)
        .bind(`${course.id}-tier-${tier.minQuantity}`, course.id, tier.minQuantity, tier.maxQuantity, tier.providerRetailPence,
          tier.aptenvoNetPence, tier.vatPence, tier.aptenvoGrossPence));
    }
  }
  await db.batch(statements);
}

export async function markProfessionalTrainingOrderPaid(
  db: D1Database,
  orderId: string,
  payment: { checkoutSessionId?: string | null; paymentIntentId?: string | null; stripeCustomerId?: string | null },
) {
  await db.batch([
    db.prepare(`UPDATE orders SET status='paid',stripe_checkout_session_id=COALESCE(?,stripe_checkout_session_id),
      stripe_payment_intent_id=COALESCE(?,stripe_payment_intent_id),stripe_customer_id=COALESCE(?,stripe_customer_id),
      paid_at=COALESCE(paid_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(payment.checkoutSessionId || null, payment.paymentIntentId || null, payment.stripeCustomerId || null, orderId),
    db.prepare(`UPDATE order_items SET fulfilment_status='queued',updated_at=CURRENT_TIMESTAMP
      WHERE order_id=? AND fulfilment_status='not_started'`).bind(orderId),
    db.prepare(`UPDATE order_enrolment_details SET fulfilment_status=CASE
        WHEN EXISTS (SELECT 1 FROM order_learner_submissions s WHERE s.order_id=order_enrolment_details.order_id AND s.method='file')
          THEN 'awaiting_additional_learners' ELSE 'awaiting_enrolment' END,
      ready_for_enrolment_at=CASE
        WHEN EXISTS (SELECT 1 FROM order_learner_submissions s WHERE s.order_id=order_enrolment_details.order_id AND s.method='manual')
          THEN CURRENT_TIMESTAMP ELSE ready_for_enrolment_at END,
      updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(orderId),
    db.prepare(`UPDATE order_learner_submissions SET status=CASE WHEN method='file' THEN 'awaiting_file_review' ELSE 'awaiting_enrolment' END,
      updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(orderId),
    db.prepare(`UPDATE order_learner_assignments SET status='awaiting_enrolment',updated_at=CURRENT_TIMESTAMP
      WHERE order_id=? AND status='pending_payment'`).bind(orderId),
    db.prepare(`UPDATE order_learner_uploads SET status='awaiting_review',updated_at=CURRENT_TIMESTAMP
      WHERE order_id=? AND status='pending_payment'`).bind(orderId),
  ]);
}

export async function markProfessionalTrainingOrderFailed(db: D1Database, orderId: string, status: 'failed' | 'cancelled') {
  const fulfilment = status === 'failed' ? 'payment_failed' : 'cancelled';
  await db.batch([
    db.prepare(`UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_payment'`).bind(status, orderId),
    db.prepare(`UPDATE order_enrolment_details SET fulfilment_status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(fulfilment, orderId),
    db.prepare(`UPDATE order_learner_submissions SET status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(fulfilment, orderId),
    db.prepare(`UPDATE order_learner_assignments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(fulfilment, orderId),
    db.prepare(`UPDATE order_learner_uploads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(fulfilment, orderId),
  ]);
}
