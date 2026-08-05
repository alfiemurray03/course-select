import { onRequestPost as bootstrapCatalogue } from './bootstrap';
import { schemaStatements } from './schema';

interface Env {
  DB?: D1Database;
  BOOTSTRAP_TOKEN?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.DB) {
    return Response.json({
      error: 'database_not_bound',
      message: 'Add the D1 binding named DB first.',
    }, { status: 503 });
  }

  if (!env.BOOTSTRAP_TOKEN) {
    return Response.json({
      error: 'bootstrap_not_configured',
      message: 'Set the BOOTSTRAP_TOKEN secret before using this endpoint.',
    }, { status: 503 });
  }

  if (request.headers.get('Authorization') !== `Bearer ${env.BOOTSTRAP_TOKEN}`) {
    return Response.json({ error: 'unauthorised' }, { status: 401 });
  }

  try {
    await env.DB.batch(schemaStatements.map((statement) => env.DB!.prepare(statement)));
  } catch (error) {
    return Response.json({
      error: 'schema_initialisation_failed',
      message: error instanceof Error ? error.message : 'Unable to create the Sousa Murray eLearning database schema.',
    }, { status: 500 });
  }

  return bootstrapCatalogue(context);
};
