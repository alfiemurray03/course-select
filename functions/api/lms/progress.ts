import {
  findLibraryCourse,
  flattenCourseLessons,
} from '../../../src/libraryCatalogue';
import { resolveCourseAccess } from '../../_shared/course-entitlements';
import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type ProgressInput = {
  courseSlug?: string;
  lessonId?: string;
  selectedAnswer?: number;
};

type EnrolmentRow = {
  id: string;
  status: string;
};

type CountRow = {
  completed: number;
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;

  let input: ProgressInput;
  try {
    input = await request.json<ProgressInput>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const course = findLibraryCourse(input.courseSlug?.trim() ?? '');
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });

  const resolvedAccess = await resolveCourseAccess(env.DB, access.session.accountId, course);
  if (!resolvedAccess.active) {
    return Response.json({
      error: 'course_access_required',
      message: 'Active access to this course is required before lesson progress can be recorded.',
    }, { status: 403 });
  }

  const lessons = flattenCourseLessons(course);
  const lesson = lessons.find((item) => item.id === input.lessonId);
  if (!lesson) return Response.json({ error: 'lesson_not_found' }, { status: 404 });
  if (!Number.isInteger(input.selectedAnswer)) {
    return Response.json({ error: 'answer_required' }, { status: 400 });
  }

  const enrolment = await env.DB.prepare(`
    SELECT id, status FROM lms_enrolments
    WHERE account_id = ? AND course_slug = ? AND course_version = ?
  `).bind(access.session.accountId, course.slug, course.version).first<EnrolmentRow>();
  if (!enrolment) {
    return Response.json({
      error: 'enrolment_required',
      message: 'Enrol on the course before submitting lesson progress.',
    }, { status: 409 });
  }

  const passed = input.selectedAnswer === lesson.knowledgeCheck.answer;
  await env.DB.prepare(`
    UPDATE lms_lesson_progress
    SET status = CASE WHEN ? = 1 THEN 'completed' ELSE 'in_progress' END,
        attempts = attempts + 1,
        selected_answer = ?,
        knowledge_check_passed = ?,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE enrolment_id = ? AND lesson_id = ?
  `).bind(
    passed ? 1 : 0,
    input.selectedAnswer,
    passed ? 1 : 0,
    passed ? 1 : 0,
    enrolment.id,
    lesson.id,
  ).run();

  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS completed
    FROM lms_lesson_progress
    WHERE enrolment_id = ? AND status = 'completed'
  `).bind(enrolment.id).first<CountRow>();
  const completed = Number(count?.completed ?? 0);
  const progressPercent = Math.round((completed / lessons.length) * 100);
  const nextStatus = progressPercent >= 100 ? 'assessment_ready' : 'in_progress';

  await env.DB.prepare(`
    UPDATE lms_enrolments
    SET status = CASE WHEN status = 'completed' THEN status ELSE ? END,
        progress_percent = CASE WHEN status = 'completed' THEN progress_percent ELSE ? END,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(nextStatus, progressPercent, enrolment.id).run();

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    passed ? 'lesson_knowledge_check_passed' : 'lesson_knowledge_check_failed',
    'lms_lesson_progress',
    `${enrolment.id}:${lesson.id}`,
    {
      courseSlug: course.slug,
      lessonId: lesson.id,
      selectedAnswer: input.selectedAnswer,
      progressPercent,
      accessSource: resolvedAccess.source,
    },
  );

  return Response.json({
    passed,
    explanation: lesson.knowledgeCheck.explanation,
    progressPercent,
    completedLessons: completed,
    totalLessons: lessons.length,
    assessmentUnlocked: progressPercent >= 100,
  }, { status: passed ? 200 : 422, headers: { 'Cache-Control': 'no-store' } });
};
