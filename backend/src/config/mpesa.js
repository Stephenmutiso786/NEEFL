import { env } from './env.js';

export function resolveMpesaUrls() {
  const defaultBase = env.mpesa.baseUrl || (env.mpesa.env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke');

  return {
    oauthUrl: env.mpesa.oauthUrl || `${defaultBase}/oauth/v1/generate?grant_type=client_credentials`,
    stkPushUrl: env.mpesa.stkPushUrl || `${defaultBase}/mpesa/stkpush/v1/processrequest`,
    b2cUrl: env.mpesa.b2cUrl || `${defaultBase}/mpesa/b2c/v1/paymentrequest`
  };
}
