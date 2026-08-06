import {
  assertProductionLmsSchema,
  type ProductionLmsEnv,
} from '../../../_shared/production-lms';

type CertificateRow = {
  certificate_number: string;
  course_slug: string;
  course_code: string;
  course_title: string;
  course_version: string;
  learner_name: string;
  score_percent: number;
  statement: string;
  status: string;
  issued_at: string;
  withdrawn_at: string | null;
};

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ env, params }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  try {
    await assertProductionLmsSchema(env.DB);
  } catch {
    return Response.json({ error: 'lms_schema_not_applied' }, { status: 503 });
  }

  const token = typeof params.token === 'string' ? params.token.trim() : '';
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return Response.json({ valid: false, error: 'invalid_verification_token' }, { status: 400 });
  }

  const certificate = await env.DB.prepare(`
    SELECT certificate_number, course_slug, course_code, course_title,
           course_version, learner_name, score_percent, statement,
           status, issued_at, withdrawn_at
    FROM lms_certificates
    WHERE verification_token = ?
  `).bind(token).first<CertificateRow>();

  if (!certificate) {
    return Response.json({ valid: false, error: 'certificate_not_found' }, { status: 404 });
  }

  return Response.json({
    valid: certificate.status === 'valid',
    certificate: {
      number: certificate.certificate_number,
      learnerName: certificate.learner_name,
      courseCode: certificate.course_code,
      courseTitle: certificate.course_title,
      courseVersion: certificate.course_version,
      scorePercent: certificate.score_percent,
      statement: certificate.statement,
      status: certificate.status,
      issuedAt: certificate.issued_at,
      withdrawnAt: certificate.withdrawn_at,
    },
  }, { headers: { 'Cache-Control': 'public, max-age=300' } });
};
