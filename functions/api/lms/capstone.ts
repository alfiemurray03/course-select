import { findLibraryCourse, flattenCourseLessons } from '../../../src/libraryCatalogue';
import { resolveCourseAccess } from '../../_shared/course-entitlements';
import { capstoneSubmission, saveCapstoneSubmission } from '../../_shared/capstone';
import { recordLmsAudit, requireProductionLms, type ProductionLmsEnv } from '../../_shared/production-lms';

type CapstoneInput = { courseSlug?: string; response?: string };
type EnrolmentRow = { id: string; status: string };
type CountRow = { completed: number };

async function enrolmentForCourse(db: D1Database, accountId: string, slug: string, version: string) {
  return db.prepare(`SELECT id,status FROM lms_enrolments WHERE account_id=? AND course_slug=? AND course_version=?`)
    .bind(accountId, slug, version).first<EnrolmentRow>();
}

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;
  const slug = new URL(request.url).searchParams.get('courseSlug')?.trim() || '';
  const course = findLibraryCourse(slug);
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });
  const enrolment = await enrolmentForCourse(env.DB, access.session.accountId, course.slug, course.version);
  if (!enrolment) return Response.json({ submission: null }, { headers: { 'Cache-Control': 'no-store' } });
  const submission = await capstoneSubmission(env.DB, enrolment.id);
  return Response.json({ submission: submission ? {
    status: submission.status,
    response: submission.response_text,
    wordCount: submission.word_count,
    submittedAt: submission.submitted_at,
  } : null }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;
  let input: CapstoneInput;
  try { input = await request.json<CapstoneInput>(); }
  catch { return Response.json({ error: 'invalid_request' }, { status: 400 }); }

  const course = findLibraryCourse(input.courseSlug?.trim() || '');
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });
  if (!course.capstoneProject) return Response.json({ error: 'capstone_not_required' }, { status: 409 });

  const resolvedAccess = await resolveCourseAccess(env.DB, access.session.accountId, course);
  if (!resolvedAccess.active) return Response.json({ error: 'course_access_required' }, { status: 403 });
  const enrolment = await enrolmentForCourse(env.DB, access.session.accountId, course.slug, course.version);
  if (!enrolment) return Response.json({ error: 'enrolment_required' }, { status: 409 });

  const count = await env.DB.prepare(`SELECT COUNT(*) AS completed FROM lms_lesson_progress WHERE enrolment_id=? AND status='completed'`)
    .bind(enrolment.id).first<CountRow>();
  if (Number(count?.completed || 0) !== flattenCourseLessons(course).length) {
    return Response.json({
      error: 'lessons_incomplete',
      message: 'Complete all twelve weeks and every lesson before submitting the capstone project.',
    }, { status: 409 });
  }

  try {
    const submission = await saveCapstoneSubmission(env.DB, enrolment.id, course.slug, String(input.response || ''));
    await recordLmsAudit(env.DB, request, access.session.accountId, 'programme_capstone_submitted', 'lms_capstone_submission', submission?.id || enrolment.id, {
      courseSlug: course.slug,
      wordCount: submission?.word_count || 0,
      accessSource: resolvedAccess.source,
    });
    return Response.json({
      submitted: true,
      status: submission?.status || 'submitted',
      wordCount: submission?.word_count || 0,
      submittedAt: submission?.submitted_at || new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      error: String((error as { code?: string })?.code || 'capstone_invalid'),
      message: error instanceof Error ? error.message : 'The capstone project could not be submitted.',
      wordCount: Number((error as { wordCount?: number })?.wordCount || 0),
      minimumWords: Number((error as { minimumWords?: number })?.minimumWords || 500),
    }, { status: Number((error as { status?: number })?.status || 422) });
  }
};
