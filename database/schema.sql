PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT,
  provider_type TEXT NOT NULL DEFAULT 'third_party',
  fulfilment_method TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  provider_id INTEGER NOT NULL,
  provider_course_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  category TEXT NOT NULL,
  level TEXT,
  duration_text TEXT,
  certificate_text TEXT,
  public_price_pence INTEGER,
  reseller_cost_pence INTEGER,
  vat_rate_basis_points INTEGER NOT NULL DEFAULT 2000,
  price_verified INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS course_price_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  minimum_quantity INTEGER NOT NULL,
  maximum_quantity INTEGER,
  public_price_pence INTEGER,
  reseller_cost_pence INTEGER,
  effective_from TEXT,
  verified_at TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  customer_external_id TEXT,
  organisation_external_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'GBP',
  subtotal_pence INTEGER NOT NULL DEFAULT 0,
  vat_pence INTEGER NOT NULL DEFAULT 0,
  total_pence INTEGER NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_pence INTEGER NOT NULL,
  line_total_pence INTEGER NOT NULL,
  fulfilment_status TEXT NOT NULL DEFAULT 'not_started',
  provider_enrolment_reference TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_external_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO providers (
  public_id, name, slug, legal_name, provider_type, fulfilment_method, status
) VALUES (
  'provider_highfield', 'Highfield e-learning', 'highfield-e-learning',
  'Highfield e-learning', 'third_party', 'manual', 'draft'
);
