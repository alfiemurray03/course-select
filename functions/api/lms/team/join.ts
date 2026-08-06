import {
  recordLmsAudit,
  requireProductionLms,
  type ProductionLmsEnv,
} from '../../../_shared/production-lms';

type JoinInput = {
  invitationId?: string;
};

type InvitationRow = {
  id: string;
  organisation_id: string;
  invited_email: string | null;
  role: string;
  status: string;
};

export const onRequestPost: PagesFunction<ProductionLmsEnv> = async ({ request, env }) => {
  const access = await requireProductionLms(request, env);
  if (access.response || !access.session || !env.DB) return access.response;

  let input: JoinInput;
  try {
    input = await request.json<JoinInput>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  const invitationId = input.invitationId?.trim() ?? '';
  if (!/^lms-member-[a-f0-9]{40}$/i.test(invitationId)) {
    return Response.json({ error: 'invalid_invitation' }, { status: 400 });
  }

  const invitation = await env.DB.prepare(`
    SELECT id, organisation_id, invited_email, role, status
    FROM lms_organisation_members WHERE id = ?
  `).bind(invitationId).first<InvitationRow>();
  if (!invitation || invitation.status !== 'invited') {
    return Response.json({ error: 'invitation_unavailable' }, { status: 404 });
  }
  if (!invitation.invited_email || invitation.invited_email.toLowerCase() !== access.session.email.toLowerCase()) {
    return Response.json({
      error: 'invitation_email_mismatch',
      message: 'Sign in using the email address to which this learning invitation was issued.',
    }, { status: 403 });
  }

  await env.DB.prepare(`
    UPDATE lms_organisation_members
    SET account_id = ?, status = 'active', joined_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'invited'
  `).bind(access.session.accountId, invitation.id).run();

  await recordLmsAudit(
    env.DB,
    request,
    access.session.accountId,
    'organisation_invitation_accepted',
    'lms_organisation_member',
    invitation.id,
    { organisationId: invitation.organisation_id, role: invitation.role },
  );

  return Response.json({ joined: true, organisationId: invitation.organisation_id });
};
