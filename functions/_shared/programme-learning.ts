import type { LibraryLesson } from '../../src/libraryCatalogue';

export type ProgrammeLessonEvidenceRow = {
  enrolment_id: string;
  lesson_id: string;
  assignment_response: string | null;
  assignment_word_count: number;
  knowledge_answers_json: string;
  knowledge_score_percent: number;
  submitted_at: string;
  updated_at: string;
};

let schemaReady = false;

export async function ensureProgrammeLearningSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS lms_lesson_evidence (
      id TEXT PRIMARY KEY,
      enrolment_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      assignment_response TEXT,
      assignment_word_count INTEGER NOT NULL DEFAULT 0,
      knowledge_answers_json TEXT NOT NULL DEFAULT '[]',
      knowledge_score_percent INTEGER NOT NULL DEFAULT 0 CHECK (knowledge_score_percent BETWEEN 0 AND 100),
      submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (enrolment_id) REFERENCES lms_enrolments(id) ON DELETE CASCADE,
      UNIQUE (enrolment_id, lesson_id)
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_lms_lesson_evidence_enrolment ON lms_lesson_evidence(enrolment_id, lesson_id)'),
  ]);
  schemaReady = true;
}

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function validateAssignment(lesson: LibraryLesson, response: unknown) {
  if (!lesson.assignment) return { response: null, wordCount: 0 };
  const text = String(response || '').trim();
  const wordCount = countWords(text);
  if (wordCount < lesson.assignment.minimumWords) {
    throw Object.assign(new Error(`Complete the applied learning journal with at least ${lesson.assignment.minimumWords} words before this lesson can be completed.`), {
      code: 'assignment_incomplete',
      status: 422,
      wordCount,
      minimumWords: lesson.assignment.minimumWords,
    });
  }
  return { response: text, wordCount };
}

export async function saveProgrammeLessonEvidence(
  db: D1Database,
  enrolmentId: string,
  moduleId: string,
  lessonId: string,
  assignmentResponse: string | null,
  assignmentWordCount: number,
  selectedAnswers: number[],
  scorePercent: number,
) {
  await ensureProgrammeLearningSchema(db);
  await db.prepare(`INSERT INTO lms_lesson_evidence (
      id,enrolment_id,module_id,lesson_id,assignment_response,assignment_word_count,
      knowledge_answers_json,knowledge_score_percent,submitted_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(enrolment_id,lesson_id) DO UPDATE SET
      assignment_response=excluded.assignment_response,
      assignment_word_count=excluded.assignment_word_count,
      knowledge_answers_json=excluded.knowledge_answers_json,
      knowledge_score_percent=excluded.knowledge_score_percent,
      submitted_at=CURRENT_TIMESTAMP,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(
      crypto.randomUUID(), enrolmentId, moduleId, lessonId, assignmentResponse, assignmentWordCount,
      JSON.stringify(selectedAnswers), scorePercent,
    ).run();
}

export async function programmeLessonEvidence(db: D1Database, enrolmentId: string) {
  await ensureProgrammeLearningSchema(db);
  const result = await db.prepare(`SELECT enrolment_id,lesson_id,assignment_response,assignment_word_count,
      knowledge_answers_json,knowledge_score_percent,submitted_at,updated_at
    FROM lms_lesson_evidence WHERE enrolment_id=?`)
    .bind(enrolmentId).all<ProgrammeLessonEvidenceRow>();
  return result.results ?? [];
}
