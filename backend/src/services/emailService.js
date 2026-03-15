import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    throw new Error('SMTP not configured');
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });
  return transporter;
}

export async function sendEmail({ to, subject, text }) {
  const tx = getTransporter();
  await tx.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text
  });
}
