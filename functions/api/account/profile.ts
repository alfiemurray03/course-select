import {
  cleanEmail,
  cleanText,
  ensureAccountTables,
  requireSession,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

type ProfileRequest = {
  customerType?: string;
  legalFirstName?: string;
  legalLastName?: string;
  email?: string;
  organisationName?: string;
};

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  await ensureAccountTables(env.DB);

  const profile = await env.DB.prepare(`
    SELECT id, email, display_name, legal_first_name, legal_last_name,
           customer_type, organisation_name, age_confirmed_at, created_at, updated_at
    FROM customer_accounts
    WHERE id = ?
  `).bind(auth.session.accountId).first();

  return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPut: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound' }, { status: 503 });
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  let input: ProfileRequest;
  try {
    input = await request.json<ProfileRequest>();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const customerType = input.customerType === 'individual' || input.customerType === 'business'
    ? input.customerType
    : null;
  const legalFirstName = cleanText(input.legalFirstName, 80);
  const legalLastName = cleanText(input.legalLastName, 80);
  const email = cleanEmail(input.email);
  const organisationName = input.organisationName?.trim()
    ? cleanText(input.organisationName, 160)
    : null;

  if (!customerType || !legalFirstName || !legalLastName || !email) {
    return Response.json({
      error: 'invalid_profile',
      message: 'Select Individual or Business and provide a legal first name, legal last name and valid email address.',
    }, { status: 400 });
  }
  if (customerType === 'business' && input.organisationName?.trim() && !organisationName) {
    return Response.json({ error: 'invalid_organisation_name' }, { status: 400 });
  }

  await ensureAccountTables(env.DB);
  await env.DB.prepare(`
    UPDATE customer_accounts
    SET customer_type = ?, legal_first_name = ?, legal_last_name = ?, email = ?,
        organisation_name = ?, age_confirmed_at = COALESCE(age_confirmed_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    customerType,
    legalFirstName,
    legalLastName,
    email,
    customerType === 'business' ? organisationName : null,
    auth.session.accountId,
  ).run();

  return Response.json({ saved: true });
};
