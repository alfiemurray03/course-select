import {
  accountIdForSubject,
  authCookieName,
  base64UrlDecodeText,
  clearCookie,
  ensureAccountTables,
  normaliseAuthority,
  readCookie,
  sessionCookie,
  signValue,
  siteUrl,
  verifyValue,
  type CustomerAuthEnv,
  type CustomerSession,
} from '../../_shared/customer-auth';

type AuthTransaction = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  createdAt: number;
};

type OpenIdConfiguration = {
  issuer: string;
  jwks_uri: string;
};

type JsonWebKeySet = {
  keys: JsonWebKey[];
};

type TokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

type IdClaims = {
  sub?: string;
  oid?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  nonce?: string;
  email?: string;
  preferred_username?: string;
  emails?: string[];
  name?: string;
  given_name?: string;
  family_name?: string;
};

function decodePart<T>(part: string): T {
  return JSON.parse(base64UrlDecodeText(part)) as T;
}

function base64UrlBytes(value: string) {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function verifyIdToken(
  idToken: string,
  configuration: OpenIdConfiguration,
  clientId: string,
  expectedNonce: string,
): Promise<IdClaims | null> {
  const [headerPart, payloadPart, signaturePart, extra] = idToken.split('.');
  if (!headerPart || !payloadPart || !signaturePart || extra) return null;

  const header = decodePart<{ alg?: string; kid?: string }>(headerPart);
  const claims = decodePart<IdClaims>(payloadPart);
  if (header.alg !== 'RS256' || !header.kid) return null;

  const jwksResponse = await fetch(configuration.jwks_uri, { headers: { Accept: 'application/json' } });
  if (!jwksResponse.ok) return null;
  const jwks = await jwksResponse.json<JsonWebKeySet>();
  const jwk = jwks.keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!validSignature) return null;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== configuration.issuer) return null;
  if (!audiences.includes(clientId)) return null;
  if (!claims.exp || claims.exp <= now) return null;
  if (claims.nbf && claims.nbf > now + 60) return null;
  if (claims.nonce !== expectedNonce) return null;
  return claims;
}

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.DB || !env.ENTRA_AUTHORITY || !env.ENTRA_CLIENT_ID || !env.ENTRA_CLIENT_SECRET || !env.SESSION_SECRET) {
    return Response.json({ error: 'identity_not_configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  const transaction = await verifyValue<AuthTransaction>(readCookie(request, authCookieName()), env.SESSION_SECRET);

  if (providerError) {
    return new Response(`Sign-in could not be completed: ${providerError}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearCookie(authCookieName(), '/api/auth') },
    });
  }

  if (
    !code
    || !returnedState
    || !transaction
    || transaction.state !== returnedState
    || Date.now() - transaction.createdAt > 10 * 60 * 1000
  ) {
    return new Response('The sign-in request is invalid or has expired. Please start again from My Aptenvo.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearCookie(authCookieName(), '/api/auth') },
    });
  }

  const authority = normaliseAuthority(env.ENTRA_AUTHORITY);
  const baseUrl = siteUrl(request, env.SITE_URL);
  const redirectUri = `${baseUrl}/api/auth/callback`;
  const tokenBody = new URLSearchParams({
    client_id: env.ENTRA_CLIENT_ID,
    client_secret: env.ENTRA_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: transaction.verifier,
    scope: 'openid profile email',
  });

  const [configurationResponse, tokenResponse] = await Promise.all([
    fetch(`${authority}/v2.0/.well-known/openid-configuration`, { headers: { Accept: 'application/json' } }),
    fetch(`${authority}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    }),
  ]);

  if (!configurationResponse.ok || !tokenResponse.ok) {
    const tokenError = await tokenResponse.json<TokenResponse>().catch(() => ({} as TokenResponse));
    return Response.json({
      error: 'token_exchange_failed',
      message: tokenError.error_description ?? 'JA Group Services ID could not complete the sign-in exchange.',
    }, { status: 502, headers: { 'Set-Cookie': clearCookie(authCookieName(), '/api/auth') } });
  }

  const configuration = await configurationResponse.json<OpenIdConfiguration>();
  const tokenData = await tokenResponse.json<TokenResponse>();
  if (!tokenData.id_token) return Response.json({ error: 'missing_id_token' }, { status: 502 });

  const claims = await verifyIdToken(tokenData.id_token, configuration, env.ENTRA_CLIENT_ID, transaction.nonce);
  const subject = claims?.sub ?? claims?.oid;
  const email = claims?.email ?? claims?.preferred_username ?? claims?.emails?.[0];
  if (!claims || !subject || !email) {
    return Response.json({ error: 'invalid_identity_token', message: 'The identity token could not be verified.' }, { status: 401 });
  }

  await ensureAccountTables(env.DB);
  const accountId = await accountIdForSubject(subject);
  const displayName = claims.name ?? [claims.given_name, claims.family_name].filter(Boolean).join(' ') ?? email;
  await env.DB.prepare(`
    INSERT INTO customer_accounts (id, entra_subject, email, display_name, legal_first_name, legal_last_name, age_confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(entra_subject) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      legal_first_name = COALESCE(customer_accounts.legal_first_name, excluded.legal_first_name),
      legal_last_name = COALESCE(customer_accounts.legal_last_name, excluded.legal_last_name),
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    accountId,
    subject,
    email.toLowerCase(),
    displayName,
    claims.given_name ?? null,
    claims.family_name ?? null,
  ).run();

  const session: CustomerSession = {
    accountId,
    subject,
    email: email.toLowerCase(),
    name: displayName,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const sessionToken = await signValue(session, env.SESSION_SECRET);

  const headers = new Headers({ Location: transaction.returnTo, 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', sessionCookie(sessionToken));
  headers.append('Set-Cookie', clearCookie(authCookieName(), '/api/auth'));
  return new Response(null, { status: 302, headers });
};
