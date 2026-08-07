import {
  findLibraryCourse,
  flattenCourseLessons,
} from '../../../../src/libraryCatalogue';
import { resolveCourseAccess } from '../../../_shared/course-entitlements';
import {
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../../_shared/production-lms';

type EnrolmentRow = {
  id: string;
  status: string;
  progress_percent: number;
  assessment_score: number | null;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type ProgressRow = {
  module_id: string;
  lesson_id: string;
  status: string;
  attempts: number;
  selected_answer: number | null;
  knowledge_check_passed: number;
  started_at: string | null;
  completed_at: string | null;
};

type AttemptRow = {
  attempt_number: number;
  score_percent: number;
  pass_mark: number;
  passed: number;
  completed_at: string;
};

type CertificateRow = {
  certificate_number: string;
  verification_token: string;
  status: string;
  issued_at: string;
};

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env, params }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const course = findLibraryCourse(slug);
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });

  const resolvedAccess = await resolveCourseAccess(env.DB, access.session.accountId, course);
  if (!resolvedAccess.active) {
    return Response.json({
      course: { slug: course.slug, code: course.code, title: course.title, version: course.version },
      entitlementActive: false,
      accessSource: 'none',
      accessExpiresAt: resolvedAccess.entitlement?.expires_at ?? null,
      enrolment: null,
      lessons: [],
      attempts: [],
      certificate: null,
    }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const enrolment = await env.DB.prepare(`
    SELECT id, status, progress_percent, assessment_score,
           enrolled_at, started_at, completed_at
    FROM lms_enrolments
    WHERE account_id = ? AND course_slug = ? AND course_version = ?
  `).bind(access.session.accountId, course.slug, course.version).first<EnrolmentRow>();

  if (!enrolment) {
    return Response.json({
      course: { slug: course.slug, code: course.code, title: course.title, version: course.version },
      entitlementActive: true,
      accessSource: resolvedAccess.source,
      accessExpiresAt: resolvedAccess.entitlement?.expires_at ?? null,
      enrolment: null,
      lessons: flattenCourseLessons(course).map((lesson) => ({
        moduleId: lesson.moduleId,
        lessonId: lesson.id,
        status: 'not_started',
        attempts: 0,
        knowledgeCheckPassed: false,
      })),
      attempts: [],
      certificate: null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const [progressResult, attemptResult, certificate] = await Promise.all([
    env.DB.prepare(`
      SELECT module_id, lesson_id, status, attempts, selected_answer,
             knowledge_check_passed, started_at, completed_at
      FROM lms_lesson_progress
      WHERE enrolment_id = ?
      ORDER BY rowid
    `).bind(enrolment.id).all<ProgressRow>(),
    env.DB.prepare(`
      SELECT attempt_number, score_percent, pass_mark, passed, completed_at
      FROM lms_assessment_attempts
      WHERE enrolment_id = ?
      ORDER BY attempt_number DESC
    `).bind(enrolment.id).all<AttemptRow>(),
    env.DB.prepare(`
      SELECT certificate_number, verification_token, status, issued_at
      FROM lms_certificates WHERE enrolment_id = ?
    `).bind(enrolment.id).first<CertificateRow>(),
  ]);

  return Response.json({
    course: { slug: course.slug, code: course.code, title: course.title, version: course.version },
    entitlementActive: true,
    accessSource: resolvedAccess.source,
    accessExpiresAt: resolvedAccess.entitlement?.expires_at ?? null,
    enrolment,
    lessons: (progressResult.results ?? []).map((row) => ({
      moduleId: row.module_id,
      lessonId: row.lesson_id,
      status: row.status,
      attempts: row.attempts,
      selectedAnswer: row.selected_answer,
      knowledgeCheckPassed: Boolean(row.knowledge_check_passed),
      startedAt: row.started_at,
      completedAt: row.completed_at,
    })),
    attempts: (attemptResult.results ?? []).map((row) => ({
      attemptNumber: row.attempt_number,
      scorePercent: row.score_percent,
      passMark: row.pass_mark,
      passed: Boolean(row.passed),
      completedAt: row.completed_at,
    })),
    certificate: certificate ? {
      number: certificate.certificate_number,
      verificationToken: certificate.verification_token,
      status: certificate.status,
      issuedAt: certificate.issued_at,
    } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
};
