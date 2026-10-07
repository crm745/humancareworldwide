// Sends the actual OTP message — SendGrid for email identifiers, Twilio for mobile
// identifiers. Which one is picked is decided purely by whether the identifier looks
// like an email (has an "@") — matches the standard pattern most apps use: whichever
// channel the person typed in is the one that gets the code.
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

const PURPOSE_LABEL = {
  patient_register: 'HumanCare registration',
  patient_login: 'HumanCare login',
  vendor_password_reset: 'HumanCare password reset',
};

function isEmail(identifier) {
  return identifier.includes('@');
}

async function sendOtpEmail(email, code, purpose) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('SENDGRID_API_KEY / SENDGRID_FROM_EMAIL is not set');

  sgMail.setApiKey(apiKey);
  const label = PURPOSE_LABEL[purpose] || 'HumanCare';
  await sgMail.send({
    to: email,
    from,
    subject: `${code} is your ${label} code`,
    text: `Your ${label} verification code is ${code}. It expires in 5 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your ${label} verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>It expires in 5 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

// The mobile field is stored without its country code (the patient app splits them
// into separate `cc`/`phone` fields but only sends `phone` through) — Twilio needs a
// full E.164 number (e.g. +919876543210) though, so this fills in a default country
// code when one isn't already present. India-only assumption for now; once mobile
// numbers are stored with their real country code end to end, this can go away.
function toE164(mobile) {
  if (mobile.startsWith('+')) return mobile;
  return `+91${mobile}`;
}

async function sendOtpSms(mobile, code, purpose) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !authToken || !from) throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER is not set');

  const client = twilio(sid, authToken);
  const label = PURPOSE_LABEL[purpose] || 'HumanCare';
  await client.messages.create({
    to: toE164(mobile),
    from,
    body: `${code} is your ${label} code. It expires in 5 minutes.`,
  });
}

// Fire-and-forget from the caller's point of view isn't right here — unlike Bitrix24,
// a failed OTP send is something the person needs to know about immediately (they'll
// just be stuck waiting for a code that never arrives), so this throws on failure
// rather than swallowing the error.
async function deliverOtp(identifier, code, purpose) {
  if (isEmail(identifier)) {
    await sendOtpEmail(identifier, code, purpose);
  } else {
    await sendOtpSms(identifier, code, purpose);
  }
}

module.exports = { deliverOtp };
