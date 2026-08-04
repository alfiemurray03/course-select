import {
  clearCookie,
  normaliseAuthority,
  sessionCookieName,
  siteUrl,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  const home = `${siteUrl(request, env.SITE_URL)}/account`;
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
