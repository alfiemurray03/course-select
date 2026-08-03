import { catalogue } from '../../../src/catalogue';

interface Env {
  DB?: D1Database;
}

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  course_type: string;
  short_description: string;
  overview: string;
  audience: string;
  delivery_text: string;
  certificate_text: string;
  qualification_notice: string;
  featured: number;
  price_source: string | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  if (!slug) return Response.json({ error: 'missing_slug' }, { status: 400 });

  if (!env.DB) {
    const course = catalogue.find((entry) => entry.slug === slug);
    if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });
    return Response.json({ source: 'static-fallback', course }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  }

  try {
    const course = await env.DB.prepare(`
      SELECT
        c.id,
        c.slug,
        c.title,
        p.name AS provider,
        cat.name AS category,
        c.level,
        c.course_type,
        c.short_description,
        c.overview,
        c.audience,
        c.delivery_text,
        c.certificate_text,
        c.qualification_notice,
        c.featured,
        c.price_source
      FROM courses c
      INNER JOIN providers p ON p.id = c.provider_id
      INNER JOIN categories cat ON cat.id = c.category_id
      WHERE c.slug = ? AND c.status = 'published'
      LIMIT 1
    `).bind(slug).first<CourseRow>();

    if (!course) return Response.json({ error: 'course_not_found' }, { status: 404 });

    const [outcomes, pricing] = await Promise.all([
      env.DB.prepare(`
        SELECT outcome_text, display_order
        FROM course_learning_outcomes
        WHERE course_id = ?
        ORDER BY display_order ASC
      `).bind(course.id).all(),
      env.DB.prepare(`
        SELECT
          id,
          minimum_quantity,
          maximum_quantity,
          provider_retail_pence,
          aptenvo_net_pence,
          vat_pence,
          aptenvo_gross_pence,
          currency,
          effective_from,
          verified_at
        FROM course_price_tiers
        WHERE course_id = ? AND status = 'active'
        ORDER BY minimum_quantity ASC
      `).bind(course.id).all(),
    ]);

    return Response.json({
      source: 'd1',
      course: {
        ...course,
        featured: Boolean(course.featured),
        learning_outcomes: outcomes.results,
        pricing_tiers: pricing.results,
      },
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    return Response.json({
      error: 'course_unavailable',
      message: error instanceof Error ? error.message : 'Unable to load this Aptenvo course.',
    }, { status: 503 });
  }
};
