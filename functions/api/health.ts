interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let database = 'not-configured';

  if (env.DB) {
    try {
      await env.DB.prepare('SELECT 1').first();
      database = 'connected';
    } catch {
      database = 'unavailable';
    }
  }

  return Response.json({
    service: 'CourseSelect',
    status: 'ok',
    database,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
