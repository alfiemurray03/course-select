import { flattenCourseLessons, type LibraryCourse } from '../../src/libraryCatalogue';
import {
  ensureStandaloneEnrolmentBridge,
  type CourseEntitlementRow,
} from './course-entitlements';
import {
  saveLearnerEnrolmentDetails,
  type LearnerEnrolmentDetails,
} from './enrolment-details';
import { stableId } from './production-lms';

export async function ensureStandaloneCourseEnrolment(
  db: D1Database,
  accountId: string,
  course: LibraryCourse,
  entitlement: CourseEntitlementRow,
  learner: LearnerEnrolmentDetails,
) {
  const existing = await db.prepare(`SELECT id,course_slug,course_code,course_version,status,progress_percent,
      assessment_score,enrolled_at,started_at,completed_at,updated_at
    FROM lms_enrolments
    WHERE account_id=? AND course_slug=? AND course_version=? LIMIT 1`)
    .bind(accountId, course.slug, course.version).first<Record<string, unknown>>();
  if (existing?.id) {
    await saveLearnerEnrolmentDetails(db, String(existing.id), accountId, course, learner);
    return { enrolment: existing, created: false };
  }

  const subscriptionId = await ensureStandaloneEnrolmentBridge(db, accountId, entitlement);
  const enrolmentId = await stableId('lms-enrolment', `${accountId}:${course.slug}:${course.version}`);
  await db.prepare(`INSERT INTO lms_enrolments (
      id,account_id,subscription_id,course_slug,course_code,course_version,status,progress_percent
    ) VALUES (?,?,?,?,?,?,'enrolled',0)`)
    .bind(enrolmentId, accountId, subscriptionId, course.slug, course.code, course.version).run();

  await saveLearnerEnrolmentDetails(db, enrolmentId, accountId, course, learner);
  const lessons = flattenCourseLessons(course);
  if (lessons.length) {
    await db.batch(lessons.map((lesson) => db.prepare(`INSERT OR IGNORE INTO lms_lesson_progress (
        id,enrolment_id,module_id,lesson_id,status
      ) VALUES (?,?,?,?,'not_started')`)
      .bind(`${enrolmentId}:${lesson.id}`, enrolmentId, lesson.moduleId, lesson.id)));
  }

  const created = await db.prepare(`SELECT id,course_slug,course_code,course_version,status,progress_percent,
      assessment_score,enrolled_at,started_at,completed_at,updated_at
    FROM lms_enrolments WHERE id=?`)
    .bind(enrolmentId).first<Record<string, unknown>>();
  return { enrolment: created, created: true };
}
