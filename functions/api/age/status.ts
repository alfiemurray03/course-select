import {
  ageCookieName,
  readCookie,
  verifyValue,
  type CustomerAuthEnv,
} from '../../_shared/customer-auth';

type AgeConfirmation = {
  isAdult?: boolean;
  confirmedAt?: number;
};

export const onRequestGet: PagesFunction<CustomerAuthEnv> = async ({ request, env }) => {
  if (!env.SESSION_SECRET) {
    return Response.json({ configured: false, confirmed: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const value = await verifyValue<AgeConfirmation>(
    readCookie(request, ageCookieName()),
    env.SESSION_SECRET,
  );
  return Response.json({
    configured: true,
    confirmed: Boolean(value?.isAdult && value.confirmedAt),
  }, { headers: { 'Cache-Control': 'no-store' } });
};
