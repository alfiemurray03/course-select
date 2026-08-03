import { catalogue, singleLicenceTier } from '../../src/catalogue';

interface Env {
  DB?: D1Database;
}

const staticFallback = catalogue.map((course) => {
  const tier = singleLicenceTier(course);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    provider: course.provider,
    category: course.category,
    level: course.level,
    course_type: course.courseType,
    short_description: course.shortDescription,
    price_inc_vat_pence: tier.aptenvoGrossPence,
    featured: course.featured,
  };
});

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) {
    return Response.json({
      source: 'static-fallback',
      count: staticFallback.length,
      courses: staticFallback,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.slug,
        c.title,
        p.name AS provider,
        cat.name AS category,
        c.level,
        c.course_type,
        c.short_description,
        c.featured,
        t.aptenvo_gross_pence AS price_inc_vat_pence
      FROM courses c
      INNER JOIN providers p ON p.id = c.provider_id
      INNER JOIN categories cat ON cat.id = c.category_id
      INNER JOIN course_price_tiers t
        ON t.course_id = c.id
       AND t.minimum_quantity = 1
       AND t.status = 'active'
      WHERE c.status = 'published'
      ORDER BY c.featured DESC, c.title ASC
    `).all();

    return Response.json({
      source: 'd1',
      count: result.results.length,
      courses: result.results,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    return Response.json({
      error: 'catalogue_unavailable',
      message: error instanceof Error ? error.message : 'Unable to load the Aptenvo catalogue.',
    }, { status: 503 });
  }
};
