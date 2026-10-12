const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const { prisma } = require('../../db/prisma');
const { deliverOtp } = require('./otp-delivery.service');

const googleClient = new OAuth2Client();

const OTP_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_VERIFY_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

async function issueOtp(identifier, purpose, countryCode) {
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

  await deliverOtp(identifier, code, purpose, countryCode);
  return { throttled: false, expiresAt };
}
// the function for verify with the otp for normal users
async function verifyOtp(identifier, purpose, code) {
  const record = await prisma.otpCode.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return { ok: false, reason: 'No pending code for this identifier.' };
  if (record.expiresAt < new Date()) return { ok: false, reason: 'Code expired.' };
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    const attemptsLeft = MAX_VERIFY_ATTEMPTS - (record.attempts + 1);
    return {
      ok: false,
      reason: attemptsLeft > 0 ? 'Incorrect code.' : 'Too many incorrect attempts. Please request a new code.',
    };
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
//
function signAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

function signRefreshToken(payload) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return jwt.verify(token, secret);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Verifies a Google ID token against whichever of our client IDs (iOS/Android/Web) is set,
// and pulls out the bits we need to identify the person.
async function verifyGoogleIdToken(idToken) {
  const audience = [
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
    process.env.GOOGLE_CLIENT_ID_WEB,
  ].filter(Boolean);
  if (!audience.length) throw new Error('No GOOGLE_CLIENT_ID_* is set');

  const ticket = await googleClient.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  return { providerId: payload.sub, email: payload.email, name: payload.name };
}

// Verifies an Apple identity token. Apple only sends the person's name on their very first
// sign-in (in the client SDK response, not the token) — the caller passes it through if present.
async function verifyAppleIdToken(idToken) {
  const audience = process.env.APPLE_CLIENT_ID;
  if (!audience) throw new Error('APPLE_CLIENT_ID is not set');

  const payload = await appleSignin.verifyIdToken(idToken, { audience });
  return { providerId: payload.sub, email: payload.email };
}

// Shared by the Google and Apple login controllers: match an existing account by provider id,
// fall back to matching by email (so someone who registered with email can later add a social
// login), and only create a brand-new patient account if neither matches.
async function findOrCreateSocialUser({ provider, providerId, email, name }) {
  const idField = provider === 'google' ? 'googleId' : 'appleId';

  const existing = await prisma.user.findFirst({ where: { [idField]: providerId } });
  if (existing) return existing;

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return prisma.user.update({ where: { id: byEmail.id }, data: { [idField]: providerId } });
    }
  }

  return prisma.user.create({
    data: {
      name: name || 'HumanCare User',
      email: email || `${provider}-${providerId}@social.humancareworldwide.com`,
      [idField]: providerId,
    },
  });
}

module.exports = {
  issueOtp,
  verifyOtp,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  verifyGoogleIdToken,
  verifyAppleIdToken,
  findOrCreateSocialUser,
};
