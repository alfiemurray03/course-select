import type { LibraryCourse } from '../../src/libraryCatalogue';

export type LearnerEnrolmentDetails = {
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseLearnerEnrolmentDetails(value: Partial<LearnerEnrolmentDetails> | null | undefined) {
  return {
    legalFirstName: String(value?.legalFirstName || '').trim(),
    legalLastName: String(value?.legalLastName || '').trim(),
    enrolmentEmail: String(value?.enrolmentEmail || '').trim().toLowerCase(),
  };
}

export function validateLearnerEnrolmentDetails(value: Partial<LearnerEnrolmentDetails> | null | undefined) {
  const details = normaliseLearnerEnrolmentDetails(value);
  if (!details.legalFirstName || details.legalFirstName.length > 80) {
    throw Object.assign(new Error('Enter the learner\'s legal first name.'), { status: 400, code: 'learner_first_name_required' });
  }
  if (!details.legalLastName || details.legalLastName.length > 80) {
    throw Object.assign(new Error('Enter the learner\'s legal last name.'), { status: 400, code: 'learner_last_name_required' });
  }
  if (!emailPattern.test(details.enrolmentEmail) || details.enrolmentEmail.length > 254) {
    throw Object.assign(new Error('Enter a valid learner enrolment email address.'), { status: 400, code: 'learner_email_required' });
  }
  return details;
}

export async function ensureLearnerEnrolmentDetailsSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS lms_enrolment_learner_details (
    enrolment_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    course_slug TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_version TEXT NOT NULL,
    legal_first_name TEXT NOT NULL,
    legal_last_name TEXT NOT NULL,
    enrolment_email TEXT NOT NULL,
    confirmed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrolment_id) REFERENCES lms_enrolments(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lms_enrolment_details_account
    ON lms_enrolment_learner_details(account_id, course_slug, updated_at)`).run();
}

export async function saveLearnerEnrolmentDetails(
  db: D1Database,
  enrolmentId: string,
  accountId: string,
  course: LibraryCourse,
  input: Partial<LearnerEnrolmentDetails> | null | undefined,
) {
  const details = validateLearnerEnrolmentDetails(input);
  await ensureLearnerEnrolmentDetailsSchema(db);
  await db.prepare(`INSERT INTO lms_enrolment_learner_details (
      enrolment_id,account_id,course_slug,course_code,course_version,
      legal_first_name,legal_last_name,enrolment_email
    ) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(enrolment_id) DO UPDATE SET
      legal_first_name=excluded.legal_first_name,
      legal_last_name=excluded.legal_last_name,
      enrolment_email=excluded.enrolment_email,
      confirmed_at=CURRENT_TIMESTAMP,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(
      enrolmentId,
      accountId,
      course.slug,
      course.code,
      course.version,
      details.legalFirstName,
      details.legalLastName,
      details.enrolmentEmail,
    ).run();
  return details;
}
