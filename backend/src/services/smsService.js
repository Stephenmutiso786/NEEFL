import axios from 'axios';
import { env } from '../config/env.js';

export async function sendSms({ to, message }) {
  if (!env.sms.webhookUrl) {
    throw new Error('SMS webhook not configured');
  }
  await axios.post(
    env.sms.webhookUrl,
    { to, message },
    {
      headers: env.sms.token
        ? { Authorization: `Bearer ${env.sms.token}` }
        : undefined
    }
  );
}
