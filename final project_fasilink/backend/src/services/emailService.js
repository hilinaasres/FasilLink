const axios = require('axios');
const nodemailer = require('nodemailer');

const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'https://fasillink-app.vercel.app';
const sanitizedBackendUrl = BACKEND_URL.includes('://') ? BACKEND_URL : `http://${BACKEND_URL}`;
const backendHostname = (() => {
  try {
    return new URL(sanitizedBackendUrl).hostname;
  } catch {
    return 'localhost';
  }
})();
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'FasilLink';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${backendHostname}`;
const canSendEmail = Boolean(BREVO_API_KEY && BREVO_SENDER_EMAIL) || Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const canSendWithGmail = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = canSendWithGmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Missing required email send parameters.');
  }

  if (BREVO_API_KEY) {
    if (!BREVO_SENDER_EMAIL) {
      throw new Error('BREVO_SENDER_EMAIL must be configured when BREVO_API_KEY is set.');
    }

    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html,
        },
        {
          headers: {
            accept: 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json',
          },
          timeout: 15_000,
        }
      );
      console.log('[Mail] Sent email via Brevo.');
      return true;
    } catch (error) {
      console.error('[Mail] Brevo email failed:', error.response?.status || error.code || 'request error');
      return false;
    }
  }

  if (!transporter) {
    console.warn('[Mail] No transactional email provider is configured.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log('[Mail] Sent email via Gmail SMTP.');
    return true;
  } catch (error) {
    console.error('[Mail] Gmail email failed:', error.code || 'request error');
    return false;
  }
};

const buildVerificationLink = (token) => `${BACKEND_URL}/api/auth/verify-email/${token}`;
const buildResetLink = (token) => `${FRONTEND_BASE_URL.replace(/\/$/, '')}/reset-password/${encodeURIComponent(token)}`;

module.exports = {
  canSendEmail,
  sendEmail,
  buildVerificationLink,
  buildResetLink,
};
