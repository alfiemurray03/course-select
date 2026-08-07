import {
  findLibraryCourse,
  flattenCourseLessons,
} from '../../../src/libraryCatalogue';
import { resolveCourseAccess } from '../../_shared/course-entitlements';
import {
  recordLmsAudit,
  requireProductionLms,
  stableId,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type AssessmentInput = {
  courseSlug?: string;
  answers?: Record<string, number>;
};

type EnrolmentRow = {
  id: string;
  status: string;
  progress_percent: number;
};

type CountRow = {
  completed: number;
};

type AttemptRow = {
  total: number;
};

type CertificateRow = {
  certificate_number: string;
  verification_token: string;
  issued_at: string;
};

function certificateNumber() {
  const year = new Date().getUTCFullYear();
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `SME-${year}-${random}`;
}

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;

  let input: AssessmentInput;
  try {
    input = await request.json<AssessmentInput>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const course = findLibraryCourse(input.courseSlug?.trim() ?? '');
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });

  const resolvedAccess = await resolveCourseAccess(env.DB, access.session.accountId, course);
  if (!resolvedAccess.active) {
    return Response.json({
      error: 'course_access_required',
      message: 'Active access to this course is required before taking the final assessment.',
    }, { status: 403 });
  }

  if (!input.answers || typeof input.answers !== 'object') {
    return Response.json({ error: 'answers_required' }, { status: 400 });
  }

  const enrolment = await env.DB.prepare(`
    SELECT id, status, progress_percent
    FROM lms_enrolments
    WHERE account_id = ? AND course_slug = ? AND course_version = ?
  `).bind(access.session.accountId, course.slug, course.version).first<EnrolmentRow>();
  if (!enrolment) return Response.json({ error: 'enrolment_required' }, { status: 409 });

  const lessonCount = flattenCourseLessons(course).length;
  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS completed
    FROM lms_lesson_progress
    WHERE enrolment_id = ? AND status = 'completed'
  `).bind(enrolment.id).first<CountRow>();
  if (Number(count?.completed ?? 0) !== lessonCount) {
    return Response.json({
      error: 'lessons_incomplete',
      message: 'Complete every lesson and knowledge check before taking the final assessment.',
    }, { status: 409 });
  }

  const questions = course.finalAssessment.questions;
  const missing = questions.some((question) => !Number.isInteger(input.answers?.[question.id]));
  if (missing) {
    return Response.json({
      error: 'assessment_incomplete',
      message: 'Answer every final-assessment question before submitting.',
    }, { status: 400 });
  }

  const correct = questions.reduce(
    (total, question) => total + (input.answers?.[question.id] === question.answer ? 1 : 0),
    0,
  );
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= course.finalAssessment.passMark;
  const previous = await env.DB.prepare(`
    SELECT COUNT(*) AS total FROM lms_assessment_attempts WHERE enrolment_id = ?
  `).bind(enrolment.id).first<AttemptRow>();
  const attemptNumber = Number(previous?.total ?? 0) + 1;
  const attemptId = await stableId(
    'lms-assessment',
    `${enrolment.id}:${attemptNumber}:${crypto.randomUUID()}`,
  );

  await env.DB.prepare(`
    INSERT INTO lms_assessment_attempts (
      id, enrolment_id, attempt_number, score_percent,
      pass_mark, passed, answers_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    attemptId,
    enrolment.id,
    attemptNumber,
    score,
    course.finalAssessment.passMark,
    passed ? 1 : 0,
    JSON.stringify(input.answers),
  ).run();

  let certificate: CertificateRow | null = null;
  if (passed) {
    const existing = await env.DB.prepare(`
      SELECT certificate_number, verification_token, issued_at
      FROM lms_certificates WHERE enrolment_id = ?
    `).bind(enrolment.id).first<CertificateRow>();

    if (existing) {
      certificate = existing;
    } else {
      const number = certificateNumber();
      const verificationToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const certificateId = await stableId('lms-certificate', `${enrolment.id}:${number}`);
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE lms_enrolments
          SET status = 'completed', progress_percent = 100,
              assessment_score = ?, completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(score, enrolment.id),
        env.DB.prepare(`
          INSERT INTO lms_certificates (
            id, enrolment_id, account_id, certificate_number,
            verification_token, course_slug, course_code,
            course_title, course_version, learner_name,
            score_percent, statement, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid')
        `).bind(
          certificateId,
          enrolment.id,
          access.session.accountId,
          number,
          verificationToken,
          course.slug,
          course.code,
          course.title,
          course.version,
          access.session.name,
          score,
          course.certificateStatement,
        ),
      ]);
      certificate = await env.DB.prepare(`
        SELECT certificate_number, verification_token, issued_at
        FROM lms_certificates WHERE id = ?
      `).bind(certificateId).first<CertificateRow>();
    }
  } else {
    await env.DB.prepare(`
      UPDATE lms_enrolments
      SET status = 'assessment_ready', assessment_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(score, enrolment.id).run();
  }

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    passed ? 'final_assessment_passed' : 'final_assessment_failed',
    'lms_assessment_attempt',
    attemptId,
    {
      courseSlug: course.slug,
      score,
      passMark: course.finalAssessment.passMark,
      attemptNumber,
      accessSource: resolvedAccess.source,
    },
  );

  return Response.json({
    passed,
    score,
    passMark: course.finalAssessment.passMark,
    attemptNumber,
    review: questions.map((question) => ({
      id: question.id,
      correct: input.answers?.[question.id] === question.answer,
      explanation: question.explanation,
    })),
    certificate: certificate ? {
      number: certificate.certificate_number,
      verificationToken: certificate.verification_token,
      issuedAt: certificate.issued_at,
    } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
};
