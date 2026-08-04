interface Env {
  DB?: D1Database;
  SITE_URL?: string;
}

type CourseRow = { slug: string; updated_at: string | null };

const staticRoutes = [
  '/',
  '/courses',
  '/individuals',
  '/organisations',
  '/how-courses-are-delivered',
  '/about',
  '/support',
  '/contact',
  '/account',
  '/accessibility',
  '/complaints',
  '/terms',
  '/privacy',
  '/refunds',
  '/acceptable-use',
  '/cookies',
  '/sitemap',
];

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] ?? character);
}

function normaliseOrigin(value: string | undefined) {
  try {
    const url = new URL(value || 'https://aptenvo.jagroupservices.co.uk');
    return url.origin;
  } catch {
    return 'https://aptenvo.jagroupservices.co.uk';
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const origin = normaliseOrigin(env.SITE_URL);
  let courses: CourseRow[] = [];

  if (env.DB) {
    try {
      const result = await env.DB.prepare(`
        SELECT slug, updated_at
        FROM courses
        WHERE status = 'published'
        ORDER BY title ASC
      `).all<CourseRow>();
      courses = result.results ?? [];
    } catch {
      courses = [];
    }
  }

  const entries = [
    ...staticRoutes.map((path) => ({ loc: `${origin}${path}`, lastmod: null as string | null })),
    ...courses.map((course) => ({ loc: `${origin}/courses/${encodeURIComponent(course.slug)}`, lastmod: course.updated_at })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => {
    const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(new Date(entry.lastmod).toISOString())}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
  }).join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
