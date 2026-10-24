// Sends the actual OTP message. Email identifiers go to the email provider, mobile
// identifiers to the SMS provider — whichever channel the identifier is, that's where
// the code goes. This file is the one place to swap or add a provider.
//
// OTP_SMS_PROVIDER   = twilio | console   (default: twilio if its env vars are set)
// OTP_EMAIL_PROVIDER = sendgrid | console (default: sendgrid if its env vars are set)
//
// "console" prints the code to the server log so the app can be tested locally without
// a real provider. It is refused when NODE_ENV=production, so a missing provider there
// fails loudly instead of logging codes.
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

const PURPOSE_LABEL = {
  patient_register: 'HumanCare registration',
  patient_login: 'HumanCare login',
  patient_change_mobile: 'HumanCare mobile number change',
  patient_change_email: 'HumanCare email change',
  patient_password_reset: 'HumanCare password reset',
  corporate_login: 'HumanCare login',
  corporate_password_reset: 'HumanCare password reset',
};

function isEmail(identifier) {
  return identifier.includes('@');
}

const emailProviders = {
  async sendgrid(email, code, label) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM_EMAIL;
    if (!apiKey || !from) throw new Error('SENDGRID_API_KEY / SENDGRID_FROM_EMAIL is not set');

    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: email,
      from,
      subject: `${code} is your ${label} code`,
      text: `Your ${label} verification code is ${code}. It expires in 5 minutes. If you didn't request this, you can ignore this email.`,
      html: `<p>Your ${label} verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>It expires in 5 minutes. If you didn't request this, you can ignore this email.</p>`,
    });
  },
  console: consoleProvider,
};

// Patient mobiles are stored in E.164 already; the country-code fallback only covers
// any old record the E.164 migration couldn't rewrite.
function toE164(mobile, countryCode) {
  if (mobile.startsWith('+')) return mobile;
  return `${countryCode || '+91'}${mobile}`;
}

const smsProviders = {
  async twilio(mobile, code, label, countryCode) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !authToken || !from) throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER is not set');

    const client = twilio(sid, authToken);
    await client.messages.create({
      to: toE164(mobile, countryCode),
      from,
      body: `${code} is your ${label} code. It expires in 5 minutes.`,
    });
  },
  console: consoleProvider,
};

// TODO: replace with the real SMS provider (e.g. Twilio/MSG91) in every deployed
// environment. Development only — never reachable in production (see pickProvider).
async function consoleProvider(identifier, code, label) {
  console.log(`[DEV ONLY — no OTP provider configured] ${label} code for ${identifier}: ${code}`);
}

function pickProvider(providers, configured, fallback) {
  const name = configured || fallback;
  if (name === 'console' && process.env.NODE_ENV === 'production') {
    throw new Error('OTP provider is "console" in production — configure a real SMS/email provider');
  }
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown OTP provider "${name}"`);
  return provider;
}

// Unlike Bitrix24, a failed OTP send is something the person needs to know about
// immediately (they'd just be stuck waiting for a code that never arrives), so this
// throws on failure rather than swallowing the error.
async function deliverOtp(identifier, code, purpose, countryCode) {
  const label = PURPOSE_LABEL[purpose] || 'HumanCare';
  if (isEmail(identifier)) {
    const hasSendgrid = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;
    const send = pickProvider(emailProviders, process.env.OTP_EMAIL_PROVIDER, hasSendgrid ? 'sendgrid' : 'console');
    await send(identifier, code, label);
  } else {
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER;
    const send = pickProvider(smsProviders, process.env.OTP_SMS_PROVIDER, hasTwilio ? 'twilio' : 'console');
    await send(identifier, code, label, countryCode);
  }
}

module.exports = { deliverOtp };
