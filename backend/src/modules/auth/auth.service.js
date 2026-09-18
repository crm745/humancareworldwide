const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../db/prisma');

const OTP_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 30;

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

async function issueOtp(identifier, purpose) {
  const lastCode = await prisma.otpCode.findFirst({
    where: { identifier, purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (lastCode) {
    const secondsSinceLast = (Date.now() - lastCode.createdAt.getTime()) / 1000;
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      const secondsLeft = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      return { throttled: true, secondsLeft };
    }
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { identifier, codeHash, purpose, expiresAt },
  });

  // TODO: send via SMS/email provider. For local dev, log to console.
  console.log(`[DEV OTP] ${purpose} code for ${identifier}: ${code}`);
  return { throttled: false, expiresAt };
}

async function verifyOtp(identifier, purpose, code) {
  const record = await prisma.otpCode.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return { ok: false, reason: 'No pending code for this identifier.' };
  if (record.expiresAt < new Date()) return { ok: false, reason: 'Code expired.' };

  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) return { ok: false, reason: 'Incorrect code.' };

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
// the function for sign in access token
function signAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}
// The function sign in wth refresh token
function signRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = {
  issueOtp,
  verifyOtp,
  signAccessToken,
  signRefreshToken,
  hashPassword,
  comparePassword,
};
