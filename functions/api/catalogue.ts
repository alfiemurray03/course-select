interface Env {
  DB?: D1Database;
}

const draftCourses = [
  {
    slug: 'food-safety-level-2',
    title: 'Food Safety Level 2',
    provider: 'Highfield e-learning',
    category: 'Food Safety',
    level: 'Level 2',
    public_price_pence: 2500,
  },
  {
    slug: 'health-and-safety-level-2',
    title: 'Health and Safety Level 2',
    provider: 'Highfield e-learning',
    category: 'Health and Safety',
    level: 'Level 2',
    public_price_pence: 2500,
  },
];

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) {
    return Response.json({ source: 'draft-fallback', courses: draftCourses });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        c.slug,
        c.title,
        p.name AS provider,
        c.category,
        c.level,
        c.public_price_pence
      FROM courses c
      INNER JOIN providers p ON p.id = c.provider_id
      WHERE c.status = 'published'
      ORDER BY c.featured DESC, c.title ASC
    `).all();

    return Response.json({ source: 'd1', courses: result.results }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    return Response.json({
      error: 'catalogue_unavailable',
      message: error instanceof Error ? error.message : 'Unable to load the catalogue.',
    }, { status: 503 });
  }
};
