export interface CustomerAuthEnv {
  DB?: D1Database;
  SESSION_SECRET?: string;
  ENTRA_AUTHORITY?: string;
  ENTRA_CLIENT_ID?: string;
  ENTRA_CLIENT_SECRET?: string;
  SITE_URL?: string;
}

export type CustomerSession = {
  accountId: string;
  subject: string;
  email: string;
  name: string;
  expiresAt: number;
};

type SignedValue<T> = {
  value: T;
  signature: string;
};

const encoder = new TextEncoder();
const SESSION_COOKIE = 'aptenvo_session';
const AUTH_COOKIE = 'aptenvo_auth';
const AGE_COOKIE = 'aptenvo_age';
let accountSchemaChecked = false;

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeBytes(value: string) {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function base64UrlEncodeText(value: string) {
  return base64UrlEncodeBytes(encoder.encode(value));
}

export function base64UrlDecodeText(value: string) {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function signValue<T>(value: T, secret: string) {
  const encoded = base64UrlEncodeText(JSON.stringify(value));
  const signature = await hmac(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function verifyValue<T>(token: string | null, secret: string): Promise<T | null> {
  if (!token) return null;
  const [encoded, suppliedSignature, extra] = token.split('.');
  if (!encoded || !suppliedSignature || extra) return null;
  const expectedSignature = await hmac(encoded, secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null;
  try {
    return JSON.parse(base64UrlDecodeText(encoded)) as T;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get('Cookie') ?? '';
  for (const entry of header.split(';')) {
    const [cookieName, ...parts] = entry.trim().split('=');
    if (cookieName === name) return decodeURIComponent(parts.join('='));
  }
  return null;
}

function secureCookie(name: string, value: string, maxAge: number, path = '/') {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string, path = '/') {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function sessionCookie(token: string) {
  return secureCookie(SESSION_COOKIE, token, 60 * 60 * 24 * 7);
}

export function authCookie(token: string) {
  return secureCookie(AUTH_COOKIE, token, 60 * 10, '/api/auth');
}

export function ageCookie(token: string) {
  return secureCookie(AGE_COOKIE, token, 60 * 60 * 24 * 365);
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function authCookieName() {
  return AUTH_COOKIE;
}

export function ageCookieName() {
  return AGE_COOKIE;
}

export function normaliseAuthority(value: string) {
  return value.trim().replace(/\/+$/, '').replace(/\/v2\.0$/i, '');
}

export function siteUrl(request: Request, configured?: string) {
  if (configured) return configured.trim().replace(/\/+$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function safeReturnPath(value: string | null, fallback = '/account') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export async function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return base64UrlEncodeBytes(data);
}

export async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(digest));
}

export async function accountIdForSubject(subject: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`aptenvo:${subject}`));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `account-${hex.slice(0, 40)}`;
}

export async function getSession(request: Request, env: CustomerAuthEnv): Promise<CustomerSession | null> {
  if (!env.SESSION_SECRET) return null;
  const session = await verifyValue<CustomerSession>(readCookie(request, SESSION_COOKIE), env.SESSION_SECRET);
  if (!session || session.expiresAt <= Date.now()) return null;
  return session;
}

export async function requireSession(request: Request, env: CustomerAuthEnv) {
  const session = await getSession(request, env);
  if (!session) {
    return {
      session: null,
      response: Response.json({ error: 'authentication_required', message: 'Sign in to My Sousa Murray eLearning to continue.' }, { status: 401 }),
    } as const;
  }
  return { session, response: null } as const;
}

export async function ensureAccountTables(db: D1Database) {
  if (accountSchemaChecked) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_accounts (
      id TEXT PRIMARY KEY,
      entra_subject TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      display_name TEXT,
      legal_first_name TEXT,
      legal_last_name TEXT,
      customer_type TEXT CHECK (customer_type IN ('individual', 'business')),
      organisation_name TEXT,
      age_confirmed_at TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'closed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_saved_learners (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      label TEXT,
      legal_first_name TEXT NOT NULL,
      legal_last_name TEXT NOT NULL,
      enrolment_email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_saved_baskets (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_saved_learners_account ON customer_saved_learners(account_id, updated_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_saved_baskets_account ON customer_saved_baskets(account_id, updated_at)'),
  ]);

  const columns = await db.prepare('PRAGMA table_info(customer_accounts)').all<{ name: string }>();
  const existingColumns = new Set((columns.results ?? []).map((column) => column.name));
  const optionalColumns: Array<[string, string]> = [
    ['display_name', 'TEXT'],
    ['legal_first_name', 'TEXT'],
    ['legal_last_name', 'TEXT'],
    ['customer_type', 'TEXT'],
    ['organisation_name', 'TEXT'],
    ['age_confirmed_at', 'TEXT'],
    ['status', "TEXT NOT NULL DEFAULT 'active'"],
    ['created_at', 'TEXT'],
    ['updated_at', 'TEXT'],
  ];
  for (const [name, definition] of optionalColumns) {
    if (!existingColumns.has(name)) {
      await db.prepare(`ALTER TABLE customer_accounts ADD COLUMN ${name} ${definition}`).run();
    }
  }

  const result = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('customer_accounts', 'customer_saved_learners', 'customer_saved_baskets')
  `).first<{ total: number }>();

  if (Number(result?.total ?? 0) !== 3) {
    throw new Error('Sousa Murray eLearning could not initialise the customer account database.');
  }

  accountSchemaChecked = true;
}

export function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > maximumLength || /[\u0000-\u001f\u007f]/.test(cleaned)) return null;
  return cleaned;
}

export function cleanEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
