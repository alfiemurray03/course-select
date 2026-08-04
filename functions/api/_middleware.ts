import {
  ageCookieName,
  readCookie,
  verifyValue,
  type CustomerAuthEnv,
} from '../_shared/customer-auth';

type AgeConfirmation = {
  isAdult?: boolean;
  confirmedAt?: number;
};

export const onRequest: PagesFunction<CustomerAuthEnv> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const isCheckout = request.method === 'POST' && url.pathname === '/api/checkout';
  if (!isCheckout) return next();

  if (!env.SESSION_SECRET) {
    return Response.json({
      error: 'age_confirmation_not_configured',
      message: 'Aptenvo cannot start checkout until the 18+ confirmation service is configured.',
    }, { status: 503 });
  }

  const confirmation = await verifyValue<AgeConfirmation>(
    readCookie(request, ageCookieName()),
    env.SESSION_SECRET,
  );

  if (!confirmation?.isAdult || !confirmation.confirmedAt) {
    return Response.json({
      error: 'adult_confirmation_required',
      message: 'Aptenvo is an 18+ service. Confirm that you are aged 18 or over before proceeding to payment.',
    }, { status: 403 });
  }

  return next();
};
