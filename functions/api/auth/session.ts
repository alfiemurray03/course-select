import { getSession, type CustomerAuthEnv } from '../../_shared/customer-auth';

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  const configured = Boolean(
    env.DB
    && env.SESSION_SECRET
    && env.ENTRA_AUTHORITY
    && env.ENTRA_CLIENT_ID
    && env.ENTRA_CLIENT_SECRET,
  );
  const session = await getSession(request, env);

  return Response.json({
    configured,
    authenticated: Boolean(session),
    user: session ? {
      accountId: session.accountId,
      email: session.email,
      name: session.name,
    } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
};
