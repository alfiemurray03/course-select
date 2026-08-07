import {
  ensureAccountTables,
  requireSession,
  siteUrl,
  type CustomerAuthEnv,
  type CustomerSession,
} from './customer-auth';
import {
  PRODUCTION_LMS_SCHEMA_STATEMENTS,
  PRODUCTION_LMS_SCHEMA_VERSION,
} from './production-lms-schema';

export type LmsPlanId = 'learner' | 'learner-plus' | 'team-5' | 'team-15';
export type LmsLibraryTier = 'core' | 'complete';

export interface ProductionLmsEnv extends CustomerAuthEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_LMS_WEBHOOK_SECRET?: string;
  BOOTSTRAP_TOKEN?: string;
  LMS_SALES_ENABLED?: string;
}

export type LmsPlanDefinition = {
  id: LmsPlanId;
  name: string;
  description: string;
  amountPence: number;
  seatLimit: number;
  libraryTier: LmsLibraryTier;
  stripeProductId: string;
  stripePriceId: string;
};

export const LMS_PLANS: readonly LmsPlanDefinition[] = [
  {
    id: 'learner',
    name: 'Learner',
    description: 'Unlimited access to the core Sousa Murray Learning Library for one named learner.',
    amountPence: 999,
    seatLimit: 1,
    libraryTier: 'core',
    stripeProductId: 'prod_V1V8DQtZNzY864',
    stripePriceId: 'price_1U1S7kDLIZgCwhkLyNmWwaoL',
  },
  {
    id: 'learner-plus',
    name: 'Learner Plus',
    description: 'Unlimited access to the complete Sousa Murray Learning Library for one named learner.',
    amountPence: 1699,
    seatLimit: 1,
    libraryTier: 'complete',
    stripeProductId: 'prod_V1V8et49jLdlGm',
    stripePriceId: 'price_1U1S7uDLIZgCwhkLEYzSKZ19',
  },
  {
    id: 'team-5',
    name: 'Team 5',
    description: 'Complete Learning Library access for up to five named learners.',
    amountPence: 3999,
    seatLimit: 5,
    libraryTier: 'complete',
    stripeProductId: 'prod_V1V8hWocIbia9T',
    stripePriceId: 'price_1U1S86DLIZgCwhkLXflPN2PB',
  },
  {
    id: 'team-15',
    name: 'Team 15',
    description: 'Complete Learning Library access for up to fifteen named learners.',
    amountPence: 8999,
    seatLimit: 15,
    libraryTier: 'complete',
    stripeProductId: 'prod_V1V8gFQRnUqRvD',
    stripePriceId: 'price_1U1S8HDLIZgCwhkLVGnPyj1O',
  },
] as const;

export type IdentityProfile = {
  account_id: string;
  entra_tenant_id: string;
  entra_object_id: string;
  head_office_customer_number: string;
  stripe_customer_id: string | null;
};

export type SubscriptionRow = {
  id: string;
  account_id: string;
  plan_id: LmsPlanId;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_checkout_session_id: string | null;
  status: string;
  seat_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  grace_expires_at: string | null;
};

let lmsSchemaChecked = false;
let lmsSchemaInitialisation: Promise<void> | null = null;

export function planDefinition(planId: string | null | undefined) {
  return LMS_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function planForStripePrice(priceId: string | null | undefined) {
  return LMS_PLANS.find((plan) => plan.stripePriceId === priceId) ?? null;
}

async function initialiseProductionLmsSchema(db: D1Database) {
  await ensureAccountTables(db);

  await db.batch(
    PRODUCTION_LMS_SCHEMA_STATEMENTS.map((statement) => db.prepare(statement)),
  );

  await db.prepare(`
    INSERT OR IGNORE INTO lms_schema_versions (version)
    VALUES (?)
  `).bind(PRODUCTION_LMS_SCHEMA_VERSION).run();

  await db.batch(LMS_PLANS.map((plan, index) => db.prepare(`
    INSERT INTO lms_plans (
      id, name, description, amount_pence, currency, billing_interval,
      seat_limit, library_tier, stripe_product_id, stripe_price_id,
      active, display_order
    ) VALUES (?, ?, ?, ?, 'GBP', 'month', ?, ?, ?, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      amount_pence = excluded.amount_pence,
      seat_limit = excluded.seat_limit,
      library_tier = excluded.library_tier,
      stripe_product_id = excluded.stripe_product_id,
      stripe_price_id = excluded.stripe_price_id,
      active = 1,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    plan.id,
    plan.name,
    plan.description,
    plan.amountPence,
    plan.seatLimit,
    plan.libraryTier,
    plan.stripeProductId,
    plan.stripePriceId,
    (index + 1) * 10,
  )));

  const expectedTables = [
    'lms_schema_versions',
    'lms_identity_profiles',
    'lms_plans',
    'lms_checkout_sessions',
    'lms_subscriptions',
    'lms_organisations',
    'lms_organisation_members',
    'lms_enrolments',
    'lms_lesson_progress',
    'lms_assessment_attempts',
    'lms_certificates',
    'lms_audit_logs',
    'webhook_events',
  ];
  const placeholders = expectedTables.map(() => '?').join(', ');
  const result = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM sqlite_master
    WHERE type = 'table' AND name IN (${placeholders})
  `).bind(...expectedTables).first<{ total: number }>();

  if (Number(result?.total ?? 0) !== expectedTables.length) {
    throw new Error('The production LMS database could not be fully initialised.');
  }

  const planCount = await db.prepare(`
    SELECT COUNT(*) AS total FROM lms_plans WHERE active = 1
  `).first<{ total: number }>();
  if (Number(planCount?.total ?? 0) !== LMS_PLANS.length) {
    throw new Error('The production LMS plans could not be seeded.');
  }
}

export async function assertProductionLmsSchema(db: D1Database) {
  if (lmsSchemaChecked) return;
  if (!lmsSchemaInitialisation) {
    lmsSchemaInitialisation = initialiseProductionLmsSchema(db)
      .then(() => {
        lmsSchemaChecked = true;
      })
      .catch((error) => {
        lmsSchemaInitialisation = null;
        throw error;
      });
  }
  await lmsSchemaInitialisation;
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function stableId(prefix: string, value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `${prefix}-${bytesToHex(digest).slice(0, 40)}`;
}

function ucnCheckDigit(firstNineDigits: string) {
  const weights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const total = firstNineDigits.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
  const remainder = 11 - (total % 11);
  if (remainder === 11) return 0;
  if (remainder === 10) return null;
  return remainder;
}

async function candidateUcn(identityKey: string, salt: number) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${identityKey}:${salt}`));
  const hex = bytesToHex(digest);
  const firstNine = BigInt(`0x${hex.slice(0, 15)}`).toString().slice(0, 9).padStart(9, '0');
  const check = ucnCheckDigit(firstNine);
  return check === null ? null : `${firstNine}${check}`;
}

export function formatUcn(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : value;
}

function splitCompositeSubject(subject: string) {
  const separator = subject.indexOf(':');
  if (separator <= 0 || separator >= subject.length - 1) return null;
  return {
    tenantId: subject.slice(0, separator),
    objectId: subject.slice(separator + 1),
  };
}

export async function ensureIdentityProfile(
  db: D1Database,
  session: CustomerSession,
): Promise<IdentityProfile> {
  const existing = await db.prepare(`
    SELECT account_id, entra_tenant_id, entra_object_id,
           head_office_customer_number, stripe_customer_id
    FROM lms_identity_profiles
    WHERE account_id = ?
  `).bind(session.accountId).first<IdentityProfile>();
  if (existing) return existing;

  const identity = splitCompositeSubject(session.subject);
  if (!identity) {
    throw new Error('The JA Group Services ID session is out of date. Sign out and sign in again to refresh it.');
  }
  const { tenantId, objectId } = identity;
  const identityKey = `${tenantId}:${objectId}`;

  for (let salt = 0; salt < 30; salt += 1) {
    const ucn = await candidateUcn(identityKey, salt);
    if (!ucn) continue;
    const insert = await db.prepare(`
      INSERT OR IGNORE INTO lms_identity_profiles (
        account_id, entra_tenant_id, entra_object_id, head_office_customer_number
      ) VALUES (?, ?, ?, ?)
    `).bind(session.accountId, tenantId, objectId, ucn).run();
    if ((insert.meta?.changes ?? 0) > 0) break;
  }

  const created = await db.prepare(`
    SELECT account_id, entra_tenant_id, entra_object_id,
           head_office_customer_number, stripe_customer_id
    FROM lms_identity_profiles
    WHERE account_id = ?
  `).bind(session.accountId).first<IdentityProfile>();
  if (!created) throw new Error('A JA Group Services Unique Customer Number could not be allocated.');
  return created;
}

export async function requireProductionLms(
  request: Request,
  env: ProductionLmsEnv,
) {
  if (!env.DB) {
    return {
      session: null,
      profile: null,
      response: Response.json({
        error: 'database_not_bound',
        message: 'The production LMS database is not connected.',
      }, { status: 503 }),
    } as const;
  }

  try {
    await assertProductionLmsSchema(env.DB);
  } catch (error) {
    return {
      session: null,
      profile: null,
      response: Response.json({
        error: 'lms_initialisation_failed',
        message: error instanceof Error
          ? error.message
          : 'The production LMS database could not be initialised.',
      }, { status: 503 }),
    } as const;
  }

  const auth = await requireSession(request, env);
  if (auth.response || !auth.session) {
    return { session: null, profile: null, response: auth.response } as const;
  }

  try {
    const profile = await ensureIdentityProfile(env.DB, auth.session);
    return { session: auth.session, profile, response: null } as const;
  } catch (error) {
    return {
      session: auth.session,
      profile: null,
      response: Response.json({
        error: 'identity_profile_failed',
        message: error instanceof Error ? error.message : 'The learning identity could not be prepared.',
      }, { status: 409 }),
    } as const;
  }
}

export async function currentSubscription(db: D1Database, accountId: string) {
  return db.prepare(`
    SELECT id, account_id, plan_id, stripe_customer_id,
           stripe_subscription_id, stripe_checkout_session_id,
           status, seat_limit, current_period_start, current_period_end,
           cancel_at_period_end, grace_expires_at
    FROM lms_subscriptions
    WHERE account_id = ?
      AND (
        status IN ('active', 'trialing')
        OR (
          status = 'past_due'
          AND grace_expires_at IS NOT NULL
          AND datetime(grace_expires_at) > CURRENT_TIMESTAMP
        )
      )
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(accountId).first<SubscriptionRow>();
}

export function subscriptionHasAccess(subscription: SubscriptionRow | null) {
  if (!subscription) return false;
  if (subscription.status === 'active' || subscription.status === 'trialing') return true;
  if (subscription.status === 'past_due' && subscription.grace_expires_at) {
    return Date.parse(subscription.grace_expires_at) > Date.now();
  }
  return false;
}

export function stripeForm(values: Record<string, string | number | boolean | null | undefined>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    form.set(key, String(value));
  }
  return form;
}

export async function stripeRequest<T>(
  env: ProductionLmsEnv,
  path: string,
  values: Record<string, string | number | boolean | null | undefined>,
  idempotencyKey?: string,
): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not connected to the production LMS.');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers,
    body: stripeForm(values),
  });
  const body = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) {
    const error = body.error && typeof body.error === 'object'
      ? body.error as Record<string, unknown>
      : null;
    throw new Error(typeof error?.message === 'string' ? error.message : 'Stripe rejected the request.');
  }
  return body as T;
}

export async function stripeRetrieve<T>(
  env: ProductionLmsEnv,
  path: string,
): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not connected to the production LMS.');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const body = await response.json<Record<string, unknown>>().catch(() => ({}));
  if (!response.ok) {
    const error = body.error && typeof body.error === 'object'
      ? body.error as Record<string, unknown>
      : null;
    throw new Error(typeof error?.message === 'string' ? error.message : 'Stripe could not verify the event.');
  }
  return body as T;
}

export function productionSiteUrl(request: Request, env: ProductionLmsEnv) {
  return siteUrl(request, env.SITE_URL);
}

export async function recordLmsAudit(
  db: D1Database,
  request: Request,
  accountId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const id = await stableId('lms-audit', `${crypto.randomUUID()}:${Date.now()}`);
  await db.prepare(`
    INSERT INTO lms_audit_logs (
      id, account_id, action, entity_type, entity_id,
      ip_address, user_agent, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    accountId,
    action,
    entityType,
    entityId,
    request.headers.get('CF-Connecting-IP'),
    request.headers.get('User-Agent'),
    JSON.stringify(metadata),
  ).run();
}
