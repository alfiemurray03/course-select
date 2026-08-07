import type { LibraryCourse } from '../../src/libraryCatalogue';
import type { LearnerEnrolmentDetails } from './enrolment-details';

export type OwnCourseOrderRow = {
  id: string;
  account_id: string;
  order_reference: string;
  head_office_customer_number: string;
  central_payment_reference: string | null;
  stripe_checkout_session_id: string | null;
  status: string;
  currency: string;
  subtotal_net_pence: number;
  vat_pence: number;
  total_gross_pence: number;
  access_days: number | null;
  access_mode: 'days' | 'permanent';
  learner_first_name: string;
  learner_last_name: string;
  learner_email: string;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type OwnCourseOrderItemRow = {
  id: string;
  order_id: string;
  course_slug: string;
  course_code: string;
  course_title: string;
  course_version: string;
  unit_net_pence: number;
  unit_vat_pence: number;
  unit_gross_pence: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function ensureOwnCourseOrderSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS lms_course_purchase_orders (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      order_reference TEXT NOT NULL UNIQUE,
      head_office_customer_number TEXT NOT NULL,
      central_payment_reference TEXT,
      stripe_checkout_session_id TEXT,
      status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','completed','cancelled','failed','refunded')),
      currency TEXT NOT NULL DEFAULT 'GBP',
      subtotal_net_pence INTEGER NOT NULL DEFAULT 0,
      vat_pence INTEGER NOT NULL DEFAULT 0,
      total_gross_pence INTEGER NOT NULL DEFAULT 0,
      access_days INTEGER,
      access_mode TEXT NOT NULL CHECK (access_mode IN ('days','permanent')),
      learner_first_name TEXT NOT NULL,
      learner_last_name TEXT NOT NULL,
      learner_email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS lms_course_purchase_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      course_slug TEXT NOT NULL,
      course_code TEXT NOT NULL,
      course_title TEXT NOT NULL,
      course_version TEXT NOT NULL,
      unit_net_pence INTEGER NOT NULL,
      unit_vat_pence INTEGER NOT NULL,
      unit_gross_pence INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','refunded','revoked')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES lms_course_purchase_orders(id) ON DELETE CASCADE,
      UNIQUE (order_id, course_slug)
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_lms_course_purchase_orders_account ON lms_course_purchase_orders(account_id,status,updated_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_lms_course_purchase_items_order ON lms_course_purchase_items(order_id,status)'),
  ]);
}

export async function createOwnCourseOrder(
  db: D1Database,
  input: {
    id: string;
    accountId: string;
    orderReference: string;
    customerNumber: string;
    centralPaymentReference: string;
    stripeCheckoutSessionId: string;
    subtotalNetPence: number;
    vatPence: number;
    totalGrossPence: number;
    accessDays: number | null;
    learner: LearnerEnrolmentDetails;
    courses: readonly LibraryCourse[];
    prices: Map<string, { netPence: number; vatPence: number; grossPence: number }>;
  },
) {
  await ensureOwnCourseOrderSchema(db);
  const accessMode = input.accessDays === null ? 'permanent' : 'days';
  const statements = [
    db.prepare(`INSERT INTO lms_course_purchase_orders (
      id,account_id,order_reference,head_office_customer_number,central_payment_reference,
      stripe_checkout_session_id,status,currency,subtotal_net_pence,vat_pence,total_gross_pence,
      access_days,access_mode,learner_first_name,learner_last_name,learner_email
    ) VALUES (?,?,?,?,?,?,'created','GBP',?,?,?,?,?,?,?,?)`)
      .bind(
        input.id,
        input.accountId,
        input.orderReference,
        input.customerNumber,
        input.centralPaymentReference,
        input.stripeCheckoutSessionId,
        input.subtotalNetPence,
        input.vatPence,
        input.totalGrossPence,
        input.accessDays,
        accessMode,
        input.learner.legalFirstName,
        input.learner.legalLastName,
        input.learner.enrolmentEmail,
      ),
    ...input.courses.map((course) => {
      const price = input.prices.get(course.code);
      if (!price) throw new Error(`Missing governed price for ${course.code}.`);
      return db.prepare(`INSERT INTO lms_course_purchase_items (
        id,order_id,course_slug,course_code,course_title,course_version,
        unit_net_pence,unit_vat_pence,unit_gross_pence,status
      ) VALUES (?,?,?,?,?,?,?,?,?,'pending')`)
        .bind(
          crypto.randomUUID(),
          input.id,
          course.slug,
          course.code,
          course.title,
          course.version,
          price.netPence,
          price.vatPence,
          price.grossPence,
        );
    }),
  ];
  await db.batch(statements);
}

export async function ownCourseOrderByReference(db: D1Database, accountId: string, orderReference: string) {
  await ensureOwnCourseOrderSchema(db);
  const order = await db.prepare(`SELECT * FROM lms_course_purchase_orders WHERE account_id=? AND order_reference=? LIMIT 1`)
    .bind(accountId, orderReference).first<OwnCourseOrderRow>();
  if (!order) return { order: null, items: [] as OwnCourseOrderItemRow[] };
  const items = await db.prepare(`SELECT * FROM lms_course_purchase_items WHERE order_id=? ORDER BY created_at`)
    .bind(order.id).all<OwnCourseOrderItemRow>();
  return { order, items: items.results ?? [] };
}

export async function markOwnCourseOrderCompleted(db: D1Database, orderId: string) {
  await db.batch([
    db.prepare(`UPDATE lms_course_purchase_orders SET status='completed',completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(orderId),
    db.prepare(`UPDATE lms_course_purchase_items SET status='active',updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND status='pending'`).bind(orderId),
  ]);
}
