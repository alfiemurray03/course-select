import { catalogue } from '../../../src/catalogue';

interface Env {
  DB?: D1Database;
  BOOTSTRAP_TOKEN?: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function runInChunks(db: D1Database, statements: D1PreparedStatement[], size = 40) {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return Response.json({ error: 'database_not_bound', message: 'Add the D1 binding named DB first.' }, { status: 503 });
  }

  if (!env.BOOTSTRAP_TOKEN) {
    return Response.json({ error: 'bootstrap_not_configured', message: 'Set the BOOTSTRAP_TOKEN secret before using this endpoint.' }, { status: 503 });
  }

  const authorization = request.headers.get('Authorization');
  if (authorization !== `Bearer ${env.BOOTSTRAP_TOKEN}`) {
    return Response.json({ error: 'unauthorised' }, { status: 401 });
  }

  const statements: D1PreparedStatement[] = [];
  const categoryNames = new Set<string>();

  statements.push(
    env.DB.prepare(`
      INSERT INTO providers (
        id, name, slug, legal_name, provider_type, fulfilment_method,
        website_url, support_email, status, metadata_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug,
        legal_name = excluded.legal_name,
        provider_type = excluded.provider_type,
        fulfilment_method = excluded.fulfilment_method,
        website_url = excluded.website_url,
        support_email = excluded.support_email,
        status = excluded.status,
        metadata_json = excluded.metadata_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      'provider-highfield',
      'Highfield e-learning',
      'highfield-e-learning',
      'Highfield e-learning',
      'third_party',
      'manual',
      'https://www.highfieldelearning.com/',
      'support@highfield.co.uk',
      'active',
      JSON.stringify({ contractualReseller: 'JA Group Services Ltd', launchProvider: true }),
    ),
  );

  for (const course of catalogue) {
    if (!categoryNames.has(course.category)) {
      categoryNames.add(course.category);
      const categorySlug = slugify(course.category);
      statements.push(
        env.DB.prepare(`
          INSERT INTO categories (id, name, slug, description, status, updated_at)
          VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            slug = excluded.slug,
            description = excluded.description,
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          `category-${categorySlug}`,
          course.category,
          categorySlug,
          `Online training and focused learning covering ${course.category.toLowerCase()}.`,
        ),
      );
    }

    const categoryId = `category-${slugify(course.category)}`;
    statements.push(
      env.DB.prepare(`
        INSERT INTO courses (
          id, provider_id, provider_course_id, title, slug, category_id, level,
          course_type, short_description, overview, audience, delivery_text,
          certificate_text, qualification_notice, currency, vat_rate_basis_points,
          markup_basis_points, featured, price_verified, price_source, status,
          metadata_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GBP', 2000, 3000, ?, 0, ?, 'published', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          provider_id = excluded.provider_id,
          provider_course_id = COALESCE(courses.provider_course_id, excluded.provider_course_id),
          title = excluded.title,
          slug = excluded.slug,
          category_id = excluded.category_id,
          level = excluded.level,
          course_type = excluded.course_type,
          short_description = excluded.short_description,
          overview = excluded.overview,
          audience = excluded.audience,
          delivery_text = excluded.delivery_text,
          certificate_text = excluded.certificate_text,
          qualification_notice = excluded.qualification_notice,
          currency = excluded.currency,
          vat_rate_basis_points = excluded.vat_rate_basis_points,
          markup_basis_points = excluded.markup_basis_points,
          featured = excluded.featured,
          price_source = excluded.price_source,
          status = excluded.status,
          metadata_json = excluded.metadata_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        course.id,
        'provider-highfield',
        course.providerCourseId,
        course.title,
        course.slug,
        categoryId,
        course.level,
        course.courseType,
        course.shortDescription,
        course.overview,
        course.audience,
        course.delivery,
        course.certificate,
        course.qualificationNotice,
        course.featured ? 1 : 0,
        course.priceSource,
        JSON.stringify({ stripeProductId: course.stripeProductId, source: 'aptenvo-static-catalogue' }),
      ),
    );

    statements.push(
      env.DB.prepare(`
        INSERT INTO stripe_products (id, course_id, stripe_product_id, product_name, active, metadata_json, updated_at)
        VALUES (?, ?, NULL, ?, 0, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(course_id) DO UPDATE SET
          product_name = excluded.product_name,
          metadata_json = excluded.metadata_json,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        `stripe-product-${course.id}`,
        course.id,
        course.title,
        JSON.stringify({ courseSlug: course.slug, provider: course.provider }),
      ),
    );

    course.learningOutcomes.forEach((outcome, index) => {
      statements.push(
        env.DB.prepare(`
          INSERT INTO course_learning_outcomes (id, course_id, outcome_text, display_order)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            outcome_text = excluded.outcome_text,
            display_order = excluded.display_order
        `).bind(`${course.id}-outcome-${index + 1}`, course.id, outcome, index + 1),
      );
    });

    course.pricingTiers.forEach((tier) => {
      const tierId = `${course.id}-tier-${tier.minQuantity}`;
      statements.push(
        env.DB.prepare(`
          INSERT INTO course_price_tiers (
            id, course_id, minimum_quantity, maximum_quantity,
            provider_retail_pence, aptenvo_net_pence, vat_pence,
            aptenvo_gross_pence, currency, effective_from, status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'GBP', '2025-08-01', 'active', CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            minimum_quantity = excluded.minimum_quantity,
            maximum_quantity = excluded.maximum_quantity,
            provider_retail_pence = excluded.provider_retail_pence,
            aptenvo_net_pence = excluded.aptenvo_net_pence,
            vat_pence = excluded.vat_pence,
            aptenvo_gross_pence = excluded.aptenvo_gross_pence,
            currency = excluded.currency,
            effective_from = excluded.effective_from,
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          tierId,
          course.id,
          tier.minQuantity,
          tier.maxQuantity,
          tier.providerRetailPence,
          tier.aptenvoNetPence,
          tier.vatPence,
          tier.aptenvoGrossPence,
        ),
      );

      statements.push(
        env.DB.prepare(`
          INSERT INTO stripe_prices (
            id, course_id, price_tier_id, stripe_price_id, currency,
            unit_amount_pence, tax_behavior, active, updated_at
          ) VALUES (?, ?, ?, NULL, 'GBP', ?, 'inclusive', 0, CURRENT_TIMESTAMP)
          ON CONFLICT(course_id, price_tier_id) DO UPDATE SET
            unit_amount_pence = excluded.unit_amount_pence,
            currency = excluded.currency,
            tax_behavior = excluded.tax_behavior,
            updated_at = CURRENT_TIMESTAMP
        `).bind(`stripe-price-${tierId}`, course.id, tierId, tier.aptenvoGrossPence),
      );
    });
  }

  try {
    await runInChunks(env.DB, statements);

    const counts = await env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM providers) AS providers,
        (SELECT COUNT(*) FROM categories) AS categories,
        (SELECT COUNT(*) FROM courses WHERE status = 'published') AS courses,
        (SELECT COUNT(*) FROM course_price_tiers WHERE status = 'active') AS price_tiers,
        (SELECT COUNT(*) FROM course_learning_outcomes) AS learning_outcomes,
        (SELECT COUNT(*) FROM stripe_products) AS stripe_products,
        (SELECT COUNT(*) FROM stripe_prices) AS stripe_prices
    `).first();

    return Response.json({
      ok: true,
      message: 'Aptenvo catalogue successfully bootstrapped into D1.',
      counts,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({
      error: 'bootstrap_failed',
      message: error instanceof Error ? error.message : 'Unable to bootstrap the Aptenvo catalogue.',
    }, { status: 500 });
  }
};
