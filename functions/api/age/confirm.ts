import { ageCookie, signValue, type CustomerAuthEnv } from '../../_shared/customer-auth';

type ConfirmationRequest = {
  isAdult?: boolean;
};

export const onRequestPost: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.SESSION_SECRET) {
    return Response.json({ error: 'age_confirmation_not_configured' }, { status: 503 });
  }

  let input: ConfirmationRequest;
  try {
    input = await request.json<ConfirmationRequest>();
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (input.isAdult !== true) {
    return Response.json({ confirmed: false, message: 'Aptenvo is only available to customers aged 18 or over.' }, { status: 403 });
  }

  const token = await signValue({ isAdult: true, confirmedAt: Date.now() }, env.SESSION_SECRET);
  return Response.json({ confirmed: true }, {
    headers: {
      'Set-Cookie': ageCookie(token),
      'Cache-Control': 'no-store',
    },
  });
};
