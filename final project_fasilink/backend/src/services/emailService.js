const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);

const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
const sanitizedBackendUrl = BACKEND_URL.includes('://') ? BACKEND_URL : `http://${BACKEND_URL}`;
const backendHostname = (() => {
  try {
    return new URL(sanitizedBackendUrl).hostname;
  } catch {
    return 'localhost';
  }
})();
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${backendHostname}`;

const canSendEmail = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Missing required email send parameters.');
  }

  const message = {
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  };

  if (!transporter) {
    console.log('[Mail] SMTP not configured. Email payload below:');
    console.log(JSON.stringify(message, null, 2));
    return false;
  }

  try {
    const result = await transporter.sendMail(message);
    console.log('[Mail] Sent email to', to, 'messageId:', result.messageId);
    return true;
  } catch (error) {
    console.error('[Mail] Failed to send email:', error);
    return false;
  }
};

const buildVerificationLink = (token) => `${BACKEND_URL}/api/auth/verify-email/${token}`;
const buildResetLink = (token) => `${FRONTEND_BASE_URL}/reset-password/${token}`;

module.exports = {
  canSendEmail,
  sendEmail,
  buildVerificationLink,
  buildResetLink,
};
