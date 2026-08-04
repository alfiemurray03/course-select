import { catalogue } from '../src/catalogue';

interface Env {
  SITE_URL?: string;
}

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
  const entries = [
    ...staticRoutes.map((path) => `${origin}${path}`),
    ...catalogue.map((course) => `${origin}/courses/${encodeURIComponent(course.slug)}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`).join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
      'X-Aptenvo-Sitemap-Source': 'code',
    },
  });
};
