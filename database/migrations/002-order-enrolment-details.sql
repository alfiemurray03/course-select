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
  fulfilment_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    fulfilment_status IN (
      'pending_payment',
      'awaiting_enrolment',
      'awaiting_additional_learners',
      'enrolling',
      'enrolled',
      'cancelled',
      'payment_failed'
    )
  ),
  ready_for_enrolment_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (learner_id) REFERENCES learners(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_enrolment_fulfilment
  ON order_enrolment_details(fulfilment_status, ready_for_enrolment_at);

CREATE INDEX IF NOT EXISTS idx_order_enrolment_email
  ON order_enrolment_details(enrolment_email, created_at);
