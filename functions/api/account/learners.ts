import {
  cleanEmail,
  cleanText,
  ensureAccountTables,
  requireSession,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

type LearnerRequest = {
  id?: string;
  label?: string;
  legalFirstName?: string;
  legalLastName?: string;
  enrolmentEmail?: string;
};

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  await ensureAccountTables(env.DB);

  const result = await env.DB.prepare(`
    SELECT id, label, legal_first_name, legal_last_name, enrolment_email, created_at, updated_at
    FROM customer_saved_learners
    WHERE account_id = ?
    ORDER BY updated_at DESC, legal_last_name ASC, legal_first_name ASC
  `).bind(auth.session.accountId).all();

  return Response.json({ learners: result.results ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPost: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  let input: LearnerRequest;
  try {
    input = await request.json<LearnerRequest>();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const legalFirstName = cleanText(input.legalFirstName, 80);
  const legalLastName = cleanText(input.legalLastName, 80);
  const enrolmentEmail = cleanEmail(input.enrolmentEmail);
  const label = input.label?.trim() ? cleanText(input.label, 80) : null;
  if (!legalFirstName || !legalLastName || !enrolmentEmail) {
    return Response.json({
      error: 'invalid_learner',
      message: 'Provide the learner’s legal first name, legal last name and valid enrolment email.',
    }, { status: 400 });
  }

  await ensureAccountTables(env.DB);
  const id = input.id?.startsWith('saved-learner-') ? input.id : `saved-learner-${crypto.randomUUID()}`;
  await env.DB.prepare(`
    INSERT INTO customer_saved_learners (
      id, account_id, label, legal_first_name, legal_last_name, enrolment_email
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      legal_first_name = excluded.legal_first_name,
      legal_last_name = excluded.legal_last_name,
      enrolment_email = excluded.enrolment_email,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, auth.session.accountId, label, legalFirstName, legalLastName, enrolmentEmail).run();

  return Response.json({ saved: true, id });
};

export const onRequestDelete: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'learner_id_required' }, { status: 400 });

  await ensureAccountTables(env.DB);
  await env.DB.prepare('DELETE FROM customer_saved_learners WHERE id = ? AND account_id = ?')
    .bind(id, auth.session.accountId).run();
  return Response.json({ deleted: true });
};
