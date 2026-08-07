import {
  clearCookie,
  normaliseAuthority,
  sessionCookieName,
  siteUrl,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

function safeReturnPath(request: Request) {
  const value = new URL(request.url).searchParams.get('returnTo')?.trim() ?? '';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/account';
  return value;
}

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  const home = `${siteUrl(request, env.SITE_URL)}${safeReturnPath(request)}`;
  const location = env.ENTRA_AUTHORITY && env.ENTRA_CLIENT_ID
    ? `${normaliseAuthority(env.ENTRA_AUTHORITY)}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(home)}`
    : home;

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Set-Cookie': clearCookie(sessionCookieName()),
      'Cache-Control': 'no-store',
    },
  });
};
