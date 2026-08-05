import { catalogue, singleLicenceTier } from '../../src/catalogue';

const staticCatalogue = catalogue.map((course) => {
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

export const onRequestGet: PagesFunction = async () => Response.json({
  source: 'aptenvo-code-catalogue',
  count: staticCatalogue.length,
  courses: staticCatalogue,
}, {
  headers: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    'X-Sousa Murray eLearning-Catalogue-Source': 'code',
  },
});
