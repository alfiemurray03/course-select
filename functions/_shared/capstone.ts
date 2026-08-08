import { countWords } from './programme-learning';

export type CapstoneSubmissionRow = {
  id: string;
  enrolment_id: string;
  course_slug: string;
  response_text: string;
  word_count: number;
  status: string;
  submitted_at: string;
  updated_at: string;
};

let capstoneSchemaReady = false;

export async function ensureCapstoneSchema(db: D1Database) {
  if (capstoneSchemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS lms_capstone_submissions (
      id TEXT PRIMARY KEY,
      enrolment_id TEXT NOT NULL UNIQUE,
      course_slug TEXT NOT NULL,
      response_text TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','returned')),
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (enrolment_id) REFERENCES lms_enrolments(id) ON DELETE CASCADE
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_lms_capstone_course ON lms_capstone_submissions(course_slug,status)'),
  ]);
  capstoneSchemaReady = true;
}

export async function saveCapstoneSubmission(db: D1Database, enrolmentId: string, courseSlug: string, response: string) {
  await ensureCapstoneSchema(db);
  const text = response.trim();
  const wordCount = countWords(text);
  if (wordCount < 500) {
    throw Object.assign(new Error('Your capstone report must contain at least 500 words so it demonstrates applied learning across the programme.'), {
      code: 'capstone_too_short', status: 422, wordCount, minimumWords: 500,
    });
  }
  await db.prepare(`INSERT INTO lms_capstone_submissions (
      id,enrolment_id,course_slug,response_text,word_count,status,submitted_at,updated_at
    ) VALUES (?,?,?,?,?,'submitted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(enrolment_id) DO UPDATE SET
      course_slug=excluded.course_slug,
      response_text=excluded.response_text,
      word_count=excluded.word_count,
      status='submitted',
      submitted_at=CURRENT_TIMESTAMP,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(crypto.randomUUID(), enrolmentId, courseSlug, text, wordCount).run();
  return db.prepare(`SELECT id,enrolment_id,course_slug,response_text,word_count,status,submitted_at,updated_at
    FROM lms_capstone_submissions WHERE enrolment_id=?`).bind(enrolmentId).first<CapstoneSubmissionRow>();
}

export async function capstoneSubmission(db: D1Database, enrolmentId: string) {
  await ensureCapstoneSchema(db);
  return db.prepare(`SELECT id,enrolment_id,course_slug,response_text,word_count,status,submitted_at,updated_at
    FROM lms_capstone_submissions WHERE enrolment_id=?`).bind(enrolmentId).first<CapstoneSubmissionRow>();
}
