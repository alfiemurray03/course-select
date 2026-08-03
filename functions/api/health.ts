interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let database = 'not-configured';
  let catalogue: Record<string, unknown> | null = null;

  if (env.DB) {
    try {
      catalogue = await env.DB.prepare(`
        SELECT
          (SELECT COUNT(*) FROM providers WHERE status = 'active') AS active_providers,
          (SELECT COUNT(*) FROM categories WHERE status = 'active') AS active_categories,
          (SELECT COUNT(*) FROM courses WHERE status = 'published') AS published_courses,
          (SELECT COUNT(*) FROM course_price_tiers WHERE status = 'active') AS active_price_tiers,
          (SELECT COUNT(*) FROM stripe_prices WHERE stripe_price_id IS NOT NULL AND active = 1) AS mapped_stripe_prices
      `).first() as Record<string, unknown> | null;
      database = 'connected';
    } catch {
      database = 'unavailable-or-schema-missing';
    }
  }

  return Response.json({
    service: 'Aptenvo',
    status: database === 'unavailable-or-schema-missing' ? 'degraded' : 'ok',
    database,
    catalogue,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
