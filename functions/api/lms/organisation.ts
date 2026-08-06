import {
  currentSubscription,
  productionSiteUrl,
  recordLmsAudit,
  requireProductionLms,
  stableId,
  subscriptionHasAccess,
  type ProductionLmsEnv,
} from '../../_shared/production-lms';

type OrganisationRow = {
  id: string;
  name: string;
  owner_account_id: string;
  subscription_id: string;
};

type MemberRow = {
  id: string;
  account_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
  invited_at: string;
  joined_at: string | null;
};

type InviteInput = {
  email?: string;
  role?: 'administrator' | 'manager' | 'learner';
};

function cleanEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

async function organisationForAccount(db: D1Database, accountId: string) {
  return db.prepare(`
    SELECT organisation.id, organisation.name,
           organisation.owner_account_id, organisation.subscription_id
    FROM lms_organisations organisation
    LEFT JOIN lms_organisation_members member
      ON member.organisation_id = organisation.id
     AND member.account_id = ?
     AND member.status = 'active'
    WHERE organisation.owner_account_id = ? OR member.account_id = ?
    ORDER BY CASE WHEN organisation.owner_account_id = ? THEN 0 ELSE 1 END
    LIMIT 1
  `).bind(accountId, accountId, accountId, accountId).first<OrganisationRow>();
}

export const onRequestGet: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;
  const organisation = await organisationForAccount(env.DB, access.session.accountId);
  if (!organisation) return Response.json({ organisation: null, members: [] });
  const subscription = await env.DB.prepare(`
    SELECT seat_limit, status FROM lms_subscriptions WHERE id = ?
  `).bind(organisation.subscription_id).first<{ seat_limit: number; status: string }>();
  const members = await env.DB.prepare(`
    SELECT id, account_id, invited_email, role, status, invited_at, joined_at
    FROM lms_organisation_members
    WHERE organisation_id = ? AND status != 'removed'
    ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'administrator' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,
             invited_at
  `).bind(organisation.id).all<MemberRow>();
  return Response.json({
    organisation: {
      id: organisation.id,
      name: organisation.name,
      seatLimit: subscription?.seat_limit ?? 0,
      subscriptionStatus: subscription?.status ?? 'unknown',
    },
    members: members.results ?? [],
  }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;
  const subscription = await currentSubscription(env.DB, access.session.accountId);
  if (!subscriptionHasAccess(subscription) || !subscription || subscription.seat_limit <= 1) {
    return Response.json({ error: 'team_plan_required' }, { status: 403 });
  }
  const organisation = await organisationForAccount(env.DB, access.session.accountId);
  if (!organisation || organisation.owner_account_id !== access.session.accountId) {
    return Response.json({ error: 'organisation_owner_required' }, { status: 403 });
  }

  let input: InviteInput;
  try {
    input = await request.json<InviteInput>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  const email = cleanEmail(input.email);
  const role = input.role === 'administrator' || input.role === 'manager' ? input.role : 'learner';
  if (!email) return Response.json({ error: 'valid_email_required' }, { status: 400 });

  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM lms_organisation_members
    WHERE organisation_id = ? AND status IN ('invited', 'active')
  `).bind(organisation.id).first<{ total: number }>();
  if (Number(count?.total ?? 0) >= subscription.seat_limit) {
    return Response.json({
      error: 'seat_limit_reached',
      message: `This plan allows up to ${subscription.seat_limit} named learners.`,
    }, { status: 409 });
  }

  const duplicate = await env.DB.prepare(`
    SELECT id FROM lms_organisation_members
    WHERE organisation_id = ?
      AND lower(invited_email) = ?
      AND status IN ('invited', 'active')
  `).bind(organisation.id, email).first<{ id: string }>();
  if (duplicate) return Response.json({ error: 'member_already_exists' }, { status: 409 });

  const memberId = await stableId('lms-member', `${organisation.id}:${email}:${crypto.randomUUID()}`);
  await env.DB.prepare(`
    INSERT INTO lms_organisation_members (
      id, organisation_id, invited_email, role, status
    ) VALUES (?, ?, ?, ?, 'invited')
  `).bind(memberId, organisation.id, email, role).run();

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    'organisation_member_invited',
    'lms_organisation_member',
    memberId,
    { organisationId: organisation.id, invitedEmail: email, role },
  );

  return Response.json({
    member: { id: memberId, email, role, status: 'invited' },
    invitationUrl: `${productionSiteUrl(request, env)}/lms/team/join?invitation=${encodeURIComponent(memberId)}`,
  }, { status: 201 });
};
