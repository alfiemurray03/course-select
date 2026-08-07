import {
  LMS_PLANS,
  assertProductionLmsSchema,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';
import { PRODUCTION_LMS_SCHEMA_VERSION } from '../../_shared/production-lms-schema';

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ env }) => {
  if (!env.DB) {
    return Response.json({
      ready: false,
      status: 'database_not_bound',
      message: 'The Cloudflare D1 database binding named DB is missing.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    await assertProductionLmsSchema(env.DB);
    const [version, planCount, tableCount] = await Promise.all([
      env.DB.prepare(`
        SELECT MAX(version) AS version FROM lms_schema_versions
      `).first<{ version: number | null }>(),
      env.DB.prepare(`
        SELECT COUNT(*) AS total FROM lms_plans WHERE active = 1
      `).first<{ total: number }>(),
      env.DB.prepare(`
        SELECT COUNT(*) AS total
        FROM sqlite_master
        WHERE type = 'table' AND name LIKE 'lms_%'
      `).first<{ total: number }>(),
    ]);

    const databaseReady = Number(version?.version ?? 0) >= PRODUCTION_LMS_SCHEMA_VERSION
      && Number(planCount?.total ?? 0) === LMS_PLANS.length
      && Number(tableCount?.total ?? 0) >= 12;
    const identityReady = Boolean(
      env.SESSION_SECRET
      && env.ENTRA_AUTHORITY
      && env.ENTRA_CLIENT_ID
      && env.ENTRA_CLIENT_SECRET,
    );
    const stripeReady = Boolean(env.STRIPE_SECRET_KEY);
    const ready = databaseReady && identityReady && stripeReady;

    return Response.json({
      ready,
      status: ready ? 'ready' : 'configuration_incomplete',
      database: {
        ready: databaseReady,
        schemaVersion: Number(version?.version ?? 0),
        lmsTables: Number(tableCount?.total ?? 0),
        activePlans: Number(planCount?.total ?? 0),
      },
      identity: {
        ready: identityReady,
        provider: 'JA Group Services ID / Microsoft Entra External ID',
      },
      billing: {
        ready: stripeReady,
        provider: 'Stripe',
        webhookVerification: env.STRIPE_LMS_WEBHOOK_SECRET
          ? 'signed_webhook'
          : stripeReady
            ? 'canonical_event_retrieval'
            : 'not_configured',
        salesEnabled: env.LMS_SALES_ENABLED !== 'false',
      },
    }, {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return Response.json({
      ready: false,
      status: 'initialisation_failed',
      message: error instanceof Error ? error.message : 'The LMS could not be initialised.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
