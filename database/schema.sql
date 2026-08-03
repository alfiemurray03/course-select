PRAGMA foreign_keys = ON;

-- Aptenvo D1 schema
-- Designed for Cloudflare Pages/Workers, multiple course providers,
-- Stripe Checkout, JA Group Services ID and provider enrolment tracking.

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT,
  provider_type TEXT NOT NULL DEFAULT 'third_party',
  fulfilment_method TEXT NOT NULL DEFAULT 'manual',
  website_url TEXT,
  support_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'suspended', 'archived')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_course_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  level TEXT NOT NULL,
  course_type TEXT NOT NULL CHECK (course_type IN ('full-course', 'short-course', 'first-aid', 'specialist', 'care-standard', 'module')),
  short_description TEXT NOT NULL,
  overview TEXT NOT NULL,
  audience TEXT NOT NULL,
  delivery_text TEXT NOT NULL,
  certificate_text TEXT NOT NULL,
  qualification_notice TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  vat_rate_basis_points INTEGER NOT NULL DEFAULT 2000,
  markup_basis_points INTEGER NOT NULL DEFAULT 3000,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  price_verified INTEGER NOT NULL DEFAULT 0 CHECK (price_verified IN (0, 1)),
  price_source TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'suspended', 'archived')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS course_learning_outcomes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  outcome_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_price_tiers (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  minimum_quantity INTEGER NOT NULL CHECK (minimum_quantity > 0),
  maximum_quantity INTEGER,
  provider_retail_pence INTEGER NOT NULL CHECK (provider_retail_pence >= 0),
  aptenvo_net_pence INTEGER NOT NULL CHECK (aptenvo_net_pence >= 0),
  vat_pence INTEGER NOT NULL CHECK (vat_pence >= 0),
  aptenvo_gross_pence INTEGER NOT NULL CHECK (aptenvo_gross_pence >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  effective_from TEXT,
  effective_to TEXT,
  verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CHECK (maximum_quantity IS NULL OR maximum_quantity >= minimum_quantity),
  UNIQUE (course_id, minimum_quantity)
);

CREATE TABLE IF NOT EXISTS stripe_products (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT UNIQUE,
  product_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  last_synced_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stripe_prices (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  price_tier_id TEXT NOT NULL,
  stripe_price_id TEXT UNIQUE,
  currency TEXT NOT NULL DEFAULT 'GBP',
  unit_amount_pence INTEGER NOT NULL,
  tax_behavior TEXT NOT NULL DEFAULT 'inclusive' CHECK (tax_behavior IN ('inclusive', 'exclusive', 'unspecified')),
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (price_tier_id) REFERENCES course_price_tiers(id) ON DELETE CASCADE,
  UNIQUE (course_id, price_tier_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  external_identity_id TEXT UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  telephone TEXT,
  account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'organisation', 'both')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  company_number TEXT,
  billing_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organisation_members (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('owner', 'administrator', 'manager', 'learner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE (organisation_id, customer_id)
);

CREATE TABLE IF NOT EXISTS learners (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  organisation_id TEXT,
  provider_learner_id TEXT,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'restricted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  organisation_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_payment', 'paid', 'provisioning', 'fulfilled', 'partially_refunded', 'refunded', 'cancelled', 'failed')),
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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  price_tier_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_net_pence INTEGER NOT NULL,
  unit_vat_pence INTEGER NOT NULL,
  unit_gross_pence INTEGER NOT NULL,
  line_net_pence INTEGER NOT NULL,
  line_vat_pence INTEGER NOT NULL,
  line_gross_pence INTEGER NOT NULL,
  fulfilment_status TEXT NOT NULL DEFAULT 'not_started' CHECK (fulfilment_status IN ('not_started', 'queued', 'provisioning', 'fulfilled', 'partially_fulfilled', 'failed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (price_tier_id) REFERENCES course_price_tiers(id)
);

CREATE TABLE IF NOT EXISTS licence_allocations (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL,
  organisation_id TEXT,
  learner_id TEXT,
  course_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'enrolled', 'completed', 'expired', 'cancelled')),
  assigned_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL,
  FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS enrolments (
  id TEXT PRIMARY KEY,
  licence_allocation_id TEXT NOT NULL UNIQUE,
  provider_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  provider_enrolment_id TEXT,
  provider_status TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'provisioning', 'enrolled', 'in_progress', 'completed', 'failed', 'cancelled', 'expired')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  enrolled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  last_synced_at TEXT,
  failure_reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (licence_allocation_id) REFERENCES licence_allocations(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (learner_id) REFERENCES learners(id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  enrolment_id TEXT NOT NULL,
  provider_certificate_id TEXT,
  certificate_number TEXT,
  certificate_url TEXT,
  issued_at TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('pending', 'available', 'withdrawn', 'expired')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_events (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT,
  payload_json TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  UNIQUE (source, external_event_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_external_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_provider ON courses(provider_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON courses(featured, status);
CREATE INDEX IF NOT EXISTS idx_course_price_tiers_lookup ON course_price_tiers(course_id, minimum_quantity, maximum_quantity, status);
CREATE INDEX IF NOT EXISTS idx_course_outcomes_order ON course_learning_outcomes(course_id, display_order);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_organisation ON orders(organisation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_licence_allocations_organisation ON licence_allocations(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_licence_allocations_learner ON licence_allocations(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_enrolments_learner ON enrolments(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_enrolments_provider ON enrolments(provider_id, provider_status);
CREATE INDEX IF NOT EXISTS idx_provider_events_status ON provider_events(processing_status, received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(source, processing_status, received_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
