import {
  authCookie,
  normaliseAuthority,
  randomToken,
  safeReturnPath,
  sha256Base64Url,
  signValue,
  siteUrl,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

type AuthTransaction = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  createdAt: number;
};

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.ENTRA_AUTHORITY || !env.ENTRA_CLIENT_ID || !env.SESSION_SECRET) {
    return Response.json({
      error: 'identity_not_configured',
      message: 'My Aptenvo sign-in has not yet been connected to JA Group Services ID.',
    }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const returnTo = safeReturnPath(requestUrl.searchParams.get('returnTo'));
  const state = await randomToken();
  const nonce = await randomToken();
  const verifier = await randomToken(48);
  const challenge = await sha256Base64Url(verifier);
  const transaction: AuthTransaction = { state, nonce, verifier, returnTo, createdAt: Date.now() };
  const token = await signValue(transaction, env.SESSION_SECRET);

  const baseUrl = siteUrl(request, env.SITE_URL);
  const redirectUri = `${baseUrl}/api/auth/callback`;
  const authority = normaliseAuthority(env.ENTRA_AUTHORITY);
  const authorise = new URL(`${authority}/oauth2/v2.0/authorize`);
  authorise.searchParams.set('client_id', env.ENTRA_CLIENT_ID);
  authorise.searchParams.set('response_type', 'code');
  authorise.searchParams.set('redirect_uri', redirectUri);
  authorise.searchParams.set('response_mode', 'query');
  authorise.searchParams.set('scope', 'openid profile email');
  authorise.searchParams.set('state', state);
  authorise.searchParams.set('nonce', nonce);
  authorise.searchParams.set('code_challenge', challenge);
  authorise.searchParams.set('code_challenge_method', 'S256');
  authorise.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorise.toString(),
      'Set-Cookie': authCookie(token),
      'Cache-Control': 'no-store',
    },
  });
};
