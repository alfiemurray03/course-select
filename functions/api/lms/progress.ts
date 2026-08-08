import {
  findLibraryCourse,
  flattenCourseLessons,
  lessonKnowledgeChecks,
} from '../../../src/libraryCatalogue';
import { resolveCourseAccess } from '../../_shared/course-entitlements';
import {
  saveProgrammeLessonEvidence,
  validateAssignment,
} from '../../_shared/programme-learning';
import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type ProgressInput = {
  courseSlug?: string;
  lessonId?: string;
  selectedAnswer?: number;
  selectedAnswers?: number[];
  assignmentResponse?: string;
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

  const checks = lessonKnowledgeChecks(lesson);
  const selectedAnswers = Array.isArray(input.selectedAnswers)
    ? input.selectedAnswers.map((value) => Number(value))
    : checks.length === 1 && Number.isInteger(input.selectedAnswer)
      ? [Number(input.selectedAnswer)]
      : [];

  if (selectedAnswers.length !== checks.length || selectedAnswers.some((value, index) => (
    !Number.isInteger(value) || value < 0 || value >= checks[index].options.length
  ))) {
    return Response.json({
      error: 'all_formative_answers_required',
      message: `Answer all ${checks.length} formative questions before submitting this lesson.`,
    }, { status: 400 });
  }

  let assignment: { response: string | null; wordCount: number };
  try {
    assignment = validateAssignment(lesson, input.assignmentResponse);
  } catch (error) {
    return Response.json({
      error: String((error as { code?: string })?.code || 'assignment_incomplete'),
      message: error instanceof Error ? error.message : 'Complete the applied learning journal before submitting.',
      wordCount: Number((error as { wordCount?: number })?.wordCount || 0),
      minimumWords: Number((error as { minimumWords?: number })?.minimumWords || lesson.assignment?.minimumWords || 0),
    }, { status: Number((error as { status?: number })?.status || 422) });
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

  const correctAnswers = checks.reduce((total, check, index) => (
    total + (selectedAnswers[index] === check.answer ? 1 : 0)
  ), 0);
  const knowledgeScorePercent = Math.round((correctAnswers / checks.length) * 100);
  const passed = knowledgeScorePercent >= 80;

  await saveProgrammeLessonEvidence(
    env.DB,
    enrolment.id,
    lesson.moduleId,
    lesson.id,
    assignment.response,
    assignment.wordCount,
    selectedAnswers,
    knowledgeScorePercent,
  );

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
    selectedAnswers[0] ?? null,
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

  const incorrectExplanations = checks
    .map((check, index) => selectedAnswers[index] === check.answer ? null : check.explanation)
    .filter((value): value is string => Boolean(value));
  const explanation = passed
    ? `Formative check passed: ${correctAnswers} of ${checks.length} correct (${knowledgeScorePercent}%).${lesson.assignment ? ' Your applied learning journal has also been recorded.' : ''}`
    : `You scored ${knowledgeScorePercent}%. At least 80% is required for this lesson. Review the teaching content and try again.${incorrectExplanations.length ? ` Review points: ${incorrectExplanations.join(' ')}` : ''}`;

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    passed ? 'programme_lesson_completed' : 'programme_formative_check_not_passed',
    'lms_lesson_progress',
    `${enrolment.id}:${lesson.id}`,
    {
      courseSlug: course.slug,
      lessonId: lesson.id,
      formativeQuestionCount: checks.length,
      knowledgeScorePercent,
      assignmentWordCount: assignment.wordCount,
      progressPercent,
      accessSource: resolvedAccess.source,
    },
  );

  return Response.json({
    passed,
    explanation,
    knowledgeScorePercent,
    correctAnswers,
    totalQuestions: checks.length,
    progressPercent,
    completedLessons: completed,
    totalLessons: lessons.length,
    assessmentUnlocked: progressPercent >= 100,
  }, { status: passed ? 200 : 422, headers: { 'Cache-Control': 'no-store' } });
};
