import { findLibraryCourse } from '../../../src/libraryCatalogue';
import { centralPaymentsConfigured, type CentralPaymentsEnv } from '../../_shared/central-payments';
import { ownCoursePricing } from '../../_shared/own-course-commerce';
import type { ProductionLmsEnv } from '../../_shared/production-lms';

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const url = new URL(request.url);
  const slugs = [...new Set(String(url.searchParams.get('slugs') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean))];
  if (!slugs.length || slugs.length > 25) {
    return Response.json({ error: 'invalid_courses', message: 'Provide between 1 and 25 Sousa Murray course slugs.' }, { status: 400 });
  }

  const courses = slugs.map((slug) => findLibraryCourse(slug));
  if (courses.some((course) => !course)) {
    return Response.json({ error: 'course_not_found', message: 'One or more selected Sousa Murray courses could not be found.' }, { status: 404 });
  }

  const centralEnv = env as CentralPaymentsEnv;
  if (!centralPaymentsConfigured(centralEnv)) {
    return Response.json({
      configured: false,
      checkoutConfigured: false,
      accessConfigured: false,
      accessDays: null,
      accessLabel: null,
      items: courses.map((course) => ({ courseSlug: course!.slug, courseCode: course!.code, configured: false, grossPence: null, netPence: null, vatPence: null, currency: 'GBP' })),
      message: 'JA Group Services Central Payments is not connected.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const pricing = await ownCoursePricing(centralEnv, courses as NonNullable<(typeof courses)[number]>[]);
    const byCode = new Map(pricing.items.map((item) => [item.courseCode, item]));
    return Response.json({
      configured: pricing.configured,
      checkoutConfigured: pricing.checkoutConfigured ?? false,
      accessConfigured: pricing.accessConfigured ?? false,
      accessDays: pricing.accessDays,
      accessLabel: pricing.accessLabel,
      pricingModel: pricing.pricingModel ?? null,
      items: courses.map((course) => {
        const price = byCode.get(course!.code);
        return {
          courseSlug: course!.slug,
          courseCode: course!.code,
          configured: Boolean(price?.configured),
          grossPence: price?.grossPence ?? null,
          netPence: price?.netPence ?? null,
          vatPence: price?.vatPence ?? null,
          currency: price?.currency ?? 'GBP',
        };
      }),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      configured: false,
      checkoutConfigured: false,
      accessConfigured: false,
      accessDays: null,
      accessLabel: null,
      items: courses.map((course) => ({ courseSlug: course!.slug, courseCode: course!.code, configured: false, grossPence: null, netPence: null, vatPence: null, currency: 'GBP' })),
      message: error instanceof Error ? error.message : 'Individual course pricing could not be loaded.',
    }, { status: Number((error as { status?: number })?.status || 502), headers: { 'Cache-Control': 'no-store' } });
  }
};