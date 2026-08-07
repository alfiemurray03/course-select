import {
  findLibraryCourse,
  flattenCourseLessons,
} from '../../../src/libraryCatalogue';
import {
  ensureStandaloneEnrolmentBridge,
  resolveCourseAccess,
} from '../../_shared/course-entitlements';
import {
  recordLmsAudit,
  requireProductionLms,
  stableId,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type EnrolInput = {
  courseSlug?: string;
};

type EnrolmentRow = {
  id: string;
  course_slug: string;
  course_code: string;
  course_version: string;
  status: string;
  progress_percent: number;
  assessment_score: number | null;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;
  const result = await env.DB.prepare(`
    SELECT id, course_slug, course_code, course_version, status,
           progress_percent, assessment_score, enrolled_at,
           started_at, completed_at
    FROM lms_enrolments
    WHERE account_id = ?
    ORDER BY updated_at DESC
  `).bind(access.session.accountId).all<EnrolmentRow>();
  return Response.json({ enrolments: result.results ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;

  let input: EnrolInput;
  try {
    input = await request.json<EnrolInput>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const course = findLibraryCourse(input.courseSlug?.trim() ?? '');
  if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });

  const resolvedAccess = await resolveCourseAccess(env.DB, access.session.accountId, course);
  if (!resolvedAccess.active) {
    return Response.json({
      error: 'course_access_required',
      message: 'An active plan, course purchase or course trial containing this course is required before starting it.',
    }, { status: 403 });
  }

  const existing = await env.DB.prepare(`
    SELECT id, course_slug, course_code, course_version, status,
           progress_percent, assessment_score, enrolled_at,
           started_at, completed_at
    FROM lms_enrolments
    WHERE account_id = ? AND course_slug = ? AND course_version = ?
  `).bind(access.session.accountId, course.slug, course.version).first<EnrolmentRow>();
  if (existing) return Response.json({ enrolment: existing, created: false });

  let subscriptionId = resolvedAccess.subscription?.id ?? null;
  if (!subscriptionId && resolvedAccess.entitlement) {
    subscriptionId = await ensureStandaloneEnrolmentBridge(
      env.DB,
      access.session.accountId,
      resolvedAccess.entitlement,
    );
  }
  if (!subscriptionId) {
    return Response.json({
      error: 'course_access_link_failed',
      message: 'Your course access is active, but the LMS could not prepare the enrolment record.',
    }, { status: 500 });
  }

  const enrolmentId = await stableId(
    'lms-enrolment',
    `${access.session.accountId}:${course.slug}:${course.version}`,
  );
  await env.DB.prepare(`
    INSERT INTO lms_enrolments (
      id, account_id, subscription_id, course_slug,
      course_code, course_version, status, progress_percent
    ) VALUES (?, ?, ?, ?, ?, ?, 'enrolled', 0)
  `).bind(
    enrolmentId,
    access.session.accountId,
    subscriptionId,
    course.slug,
    course.code,
    course.version,
  ).run();

  const lessons = flattenCourseLessons(course);
  if (lessons.length) {
    await env.DB.batch(lessons.map((lesson) => env.DB!.prepare(`
      INSERT OR IGNORE INTO lms_lesson_progress (
        id, enrolment_id, module_id, lesson_id, status
      ) VALUES (?, ?, ?, ?, 'not_started')
    `).bind(
      `${enrolmentId}:${lesson.id}`,
      enrolmentId,
      lesson.moduleId,
      lesson.id,
    )));
  }

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    'course_enrolled',
    'lms_enrolment',
    enrolmentId,
    {
      courseSlug: course.slug,
      courseCode: course.code,
      courseVersion: course.version,
      subscriptionId,
      accessSource: resolvedAccess.source,
      entitlementId: resolvedAccess.entitlement?.id ?? null,
      entitlementExpiresAt: resolvedAccess.entitlement?.expires_at ?? null,
    },
  );

  const created = await env.DB.prepare(`
    SELECT id, course_slug, course_code, course_version, status,
           progress_percent, assessment_score, enrolled_at,
           started_at, completed_at
    FROM lms_enrolments WHERE id = ?
  `).bind(enrolmentId).first<EnrolmentRow>();

  return Response.json({ enrolment: created, created: true }, { status: 201 });
};
