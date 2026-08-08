import { findLibraryCourse } from '../../../src/libraryCatalogue';
import { ownCourseIndividualPrice } from '../../../src/ownCoursePricing';
import { centralPaymentsConfigured, type CentralPaymentsEnv } from '../../_shared/central-payments';
import { ownCoursePricing } from '../../_shared/own-course-commerce';
import type { ProductionLmsEnv } from '../../_shared/production-lms';

function governedPrice(course: NonNullable<ReturnType<typeof findLibraryCourse>>) {
  const price = ownCourseIndividualPrice(course);
  return {
    courseSlug: course.slug,
    courseCode: course.code,
    configured: true,
    stripePriceConfigured: false,
    grossPence: price.grossPence,
    netPence: price.retailNetPence,
    vatPence: price.vatPence,
    currency: 'GBP',
    pricingBand: price.id,
    pricingScore: price.score,
    pricingSource: 'governed_complexity_bands',
  };
}

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

  const validCourses = courses as NonNullable<(typeof courses)[number]>[];
  const localPrices = new Map(validCourses.map((course) => [course.code, governedPrice(course)]));
  const centralEnv = env as CentralPaymentsEnv;

  if (!centralPaymentsConfigured(centralEnv)) {
    return Response.json({
      configured: false,
      priceCatalogueConfigured: false,
      checkoutConfigured: false,
      accessConfigured: false,
      priceDisplayConfigured: true,
      accessDays: null,
      accessLabel: null,
      pricingModel: 'governed_complexity_bands',
      items: validCourses.map((course) => localPrices.get(course.code)),
      message: 'Approved individual course prices are available. JA Group Services Central Payments is not currently connected, so checkout is unavailable.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const pricing = await ownCoursePricing(centralEnv, validCourses);
    const byCode = new Map(pricing.items.map((item) => [item.courseCode, item]));
    const items = validCourses.map((course) => {
      const local = localPrices.get(course.code)!;
      const central = byCode.get(course.code);
      return {
        ...local,
        stripePriceConfigured: Boolean(central?.configured && Number(central.grossPence) > 0),
        grossPence: central?.configured && central.grossPence ? central.grossPence : local.grossPence,
        netPence: central?.configured && central.netPence !== null ? central.netPence : local.netPence,
        vatPence: central?.configured && central.vatPence !== null ? central.vatPence : local.vatPence,
        currency: central?.currency ?? 'GBP',
      };
    });
    const stripePricesReady = Boolean(pricing.configured && items.every((item) => item.stripePriceConfigured));
    const checkoutConfigured = Boolean(stripePricesReady && pricing.checkoutConfigured);
    const message = !stripePricesReady
      ? 'Approved course prices are shown below while the Stripe product catalogue finishes reconciling those prices.'
      : !pricing.accessConfigured
        ? 'Course prices are ready. The individual-course access term still needs to be confirmed in Head Office before checkout can open.'
        : undefined;

    return Response.json({
      configured: checkoutConfigured,
      priceCatalogueConfigured: stripePricesReady,
      checkoutConfigured,
      accessConfigured: pricing.accessConfigured ?? false,
      priceDisplayConfigured: true,
      accessDays: pricing.accessDays,
      accessLabel: pricing.accessLabel,
      pricingModel: pricing.pricingModel ?? 'governed_complexity_bands',
      items,
      ...(message ? { message } : {}),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      configured: false,
      priceCatalogueConfigured: false,
      checkoutConfigured: false,
      accessConfigured: false,
      priceDisplayConfigured: true,
      accessDays: null,
      accessLabel: null,
      pricingModel: 'governed_complexity_bands',
      items: validCourses.map((course) => localPrices.get(course.code)),
      message: `Approved course prices are available, but Central Payments could not confirm Stripe readiness: ${error instanceof Error ? error.message : 'unknown Central Payments error'}`,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }
};