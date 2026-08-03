PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS order_enrolment_details (
  order_id TEXT PRIMARY KEY,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'business')),
  legal_first_name TEXT NOT NULL,
  legal_last_name TEXT NOT NULL,
  enrolment_email TEXT NOT NULL,
  organisation_name TEXT,
  learner_id TEXT,
  provider_sharing_consent INTEGER NOT NULL DEFAULT 0 CHECK (provider_sharing_consent IN (0, 1)),
  consent_recorded_at TEXT,
  additional_learner_details_required INTEGER NOT NULL DEFAULT 0 CHECK (additional_learner_details_required IN (0, 1)),
  fulfilment_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (fulfilment_status IN ('pending_payment', 'awaiting_enrolment', 'awaiting_additional_learners', 'enrolling', 'enrolled', 'cancelled', 'payment_failed')),
  ready_for_enrolment_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_learner_submissions (
  order_id TEXT PRIMARY KEY,
  method TEXT NOT NULL CHECK (method IN ('manual', 'file')),
  expected_learner_count INTEGER NOT NULL,
  submitted_learner_count INTEGER NOT NULL DEFAULT 0,
  authority_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (authority_confirmed IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'awaiting_enrolment', 'awaiting_file_review', 'enrolling', 'enrolled', 'cancelled', 'payment_failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_learner_assignments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  legal_first_name TEXT NOT NULL,
  legal_last_name TEXT NOT NULL,
  enrolment_email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'file')),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'awaiting_enrolment', 'enrolling', 'enrolled', 'cancelled', 'payment_failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (learner_id) REFERENCES learners(id),
  UNIQUE (order_item_id, position)
);

CREATE TABLE IF NOT EXISTS order_learner_uploads (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'awaiting_review', 'reviewed', 'cancelled', 'payment_failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_learner_assignments_order ON order_learner_assignments(order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_learner_uploads_order ON order_learner_uploads(order_id, status);
