import axios from 'axios';
import dayjs from 'dayjs';
import { env } from '../config/env.js';
import { resolveMpesaUrls } from '../config/mpesa.js';

function ensureMpesaConfig() {
  if (!env.mpesa.consumerKey || !env.mpesa.consumerSecret) {
    throw new Error('M-Pesa consumer key/secret missing');
  }
}

async function getAccessToken() {
  ensureMpesaConfig();
  const { oauthUrl } = resolveMpesaUrls();
  const auth = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString('base64');
  const response = await axios.get(oauthUrl, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return response.data.access_token;
}

function buildPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

export async function stkPush({ amount, phone, accountReference, transactionDesc, callbackUrl }) {
  const token = await getAccessToken();
  const { stkPushUrl } = resolveMpesaUrls();
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const shortcode = env.mpesa.shortcode;
  const passkey = env.mpesa.passkey;

  if (!shortcode || !passkey) {
    throw new Error('M-Pesa shortcode/passkey missing');
  }

  const body = {
    BusinessShortCode: shortcode,
    Password: buildPassword(shortcode, passkey, timestamp),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc
  };

  const response = await axios.post(stkPushUrl, body, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export async function b2cPayout({ amount, phone, remarks, occasion }) {
  const token = await getAccessToken();
  const { b2cUrl } = resolveMpesaUrls();

  const shortcode = env.mpesa.b2cShortcode;
  const initiatorName = env.mpesa.b2cInitiatorName;
  const securityCredential = env.mpesa.b2cSecurityCredential;

  if (!shortcode || !initiatorName || !securityCredential) {
    throw new Error('M-Pesa B2C config missing');
  }

  const body = {
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: 'BusinessPayment',
    Amount: amount,
    PartyA: shortcode,
    PartyB: phone,
    Remarks: remarks || 'Prize payout',
    QueueTimeOutURL: env.mpesa.timeoutUrl,
    ResultURL: env.mpesa.resultUrl,
    Occasion: occasion || ''
  };

  const response = await axios.post(b2cUrl, body, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}
