const crypto = require('crypto');
const { prisma } = require('../../db/prisma');
const { sendMail } = require('../../lib/mailer');
const { hashPassword } = require('../auth/auth.service');

const EMAIL_VERIFY_TTL_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 45; // matches the corporate-portal's own countdown UI

// Full account number is kept in the DB (Finance needs it to actually pay the
// corporate later) but is never sent back to the unauthenticated registrant — only
// the admin-facing view gets the unmasked version. Mirrors the corporate-portal's
// own maskBank() so the shape the registrant sees is unchanged from before.
function maskBank(bank) {
  const domestic = bank.bankType === 'Domestic';
  const last4 = (v) => (v ? String(v).slice(-4) : '');
  return {
    bankType: bank.bankType,
    bankName: bank.bankName,
    accountHolder: bank.accountHolder,
    accountLast4: last4(bank.accountNumber),
    ...(domestic
      ? { ifsc: bank.ifsc, branchName: bank.branchName, branchAddress: bank.branchAddress }
      : { swift: bank.swift, ibanLast4: last4(bank.iban), bankCountry: bank.bankCountry, bankAddress: bank.bankAddress, currency: bank.currency }),
  };
}

function deriveStatus(reg) {
  if (reg.credentialsCreated) return 'Active';
  if (reg.rejectedAt) return 'Rejected';
  if (reg.approved && reg.emailVerified) return 'Verified';
  return 'Pending Verification';
}

// Shape returned to the (not-yet-logged-in) registrant via /corporates/* — bank is
// masked, no internal ids (approvedBy, rejectionReason) leak out.
function toPublicRegistration(reg) {
  return {
    id: reg.id,
    corporateId: reg.corporateRefId,
    company: reg.company,
    bank: maskBank(reg.bank),
    documents: reg.documents,
    email: reg.email,
    emailVerified: reg.emailVerified,
    approved: reg.approved,
    credentialsCreated: reg.credentialsCreated,
    submittedAt: reg.submittedAt,
    status: deriveStatus(reg),
  };
}

// Shape returned to Admin — full bank details (Finance needs to verify the real
// account), plus the review fields the public view never sees.
function toAdminRegistration(reg) {
  return {
    id: reg.id,
    corporateId: reg.corporateRefId,
    company: reg.company,
    bank: reg.bank,
    documents: reg.documents,
    email: reg.email,
    emailVerified: reg.emailVerified,
    approved: reg.approved,
    approvedAt: reg.approvedAt,
    rejectedAt: reg.rejectedAt,
    rejectionReason: reg.rejectionReason,
    credentialsCreated: reg.credentialsCreated,
    submittedAt: reg.submittedAt,
    status: deriveStatus(reg),
  };
}

async function sendVerificationEmail(reg) {
  const portalUrl = process.env.CORPORATE_PORTAL_URL || 'http://localhost:5173';
  const link = `${portalUrl}/register/verify-email?token=${reg.emailVerifyToken}`;

  await sendMail({
    to: reg.email,
    subject: 'Verify your email — HumanCare corporate registration',
    text: `Confirm your email to continue your HumanCare corporate registration (Corporate ID ${reg.corporateRefId}): ${link}\nThis link expires in ${EMAIL_VERIFY_TTL_HOURS} hours.`,
    html: `<p>Confirm your email to continue your HumanCare corporate registration (Corporate ID <strong>${reg.corporateRefId}</strong>):</p><p><a href="${link}">${link}</a></p><p>This link expires in ${EMAIL_VERIFY_TTL_HOURS} hours.</p>`,
  });
}

function newVerifyToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createRegistration({ company, bank, documents, email }) {
  const created = await prisma.corporateRegistration.create({
    data: {
      corporateRefId: `TEMP-${Date.now()}`,
      company,
      bank,
      documents,
      email,
      emailVerifyToken: newVerifyToken(),
      emailVerifyExpiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000),
    },
  });
  const reg = await prisma.corporateRegistration.update({
    where: { id: created.id },
    data: { corporateRefId: `HCW-COR-${new Date().getFullYear()}-${String(10000 + created.id)}` },
  });

  try {
    await sendVerificationEmail(reg);
  } catch (err) {
    // The registration is already saved — a flaky email send shouldn't lose the
    // submission. The registrant can hit "resend" once they're on the next screen.
    console.error(`Verification email failed to send for ${reg.corporateRefId}:`, err.message);
  }

  return toPublicRegistration(reg);
}

async function getRegistrationOr404(id) {
  const reg = await prisma.corporateRegistration.findUnique({ where: { id: Number(id) } });
  if (!reg) {
    const err = new Error('Registration not found.');
    err.statusCode = 404;
    throw err;
  }
  return reg;
}

async function getPublicRegistration(id) {
  return toPublicRegistration(await getRegistrationOr404(id));
}

async function resendVerificationEmail(id) {
  const reg = await getRegistrationOr404(id);
  if (reg.emailVerified) return toPublicRegistration(reg);
  if (reg.updatedAt > new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000)) {
    const err = new Error(`Please wait before requesting another email.`);
    err.statusCode = 429;
    throw err;
  }
  const updated = await prisma.corporateRegistration.update({
    where: { id: reg.id },
    data: { emailVerifyToken: newVerifyToken(), emailVerifyExpiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000) },
  });
  await sendVerificationEmail(updated);
  return toPublicRegistration(updated);
}

async function changeRegistrationEmail(id, email) {
  const reg = await getRegistrationOr404(id);
  if (email.toLowerCase() === reg.email.toLowerCase()) {
    const err = new Error('This is already your registered email.');
    err.statusCode = 409;
    throw err;
  }
  const updated = await prisma.corporateRegistration.update({
    where: { id: reg.id },
    data: {
      email: email.toLowerCase(),
      emailVerified: false,
      emailVerifyToken: newVerifyToken(),
      emailVerifyExpiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000),
    },
  });
  await sendVerificationEmail(updated);
  return toPublicRegistration(updated);
}

// Called when the registrant clicks the link in their email.
async function verifyEmailToken(token) {
  const reg = await prisma.corporateRegistration.findUnique({ where: { emailVerifyToken: token } });
  if (!reg) {
    const err = new Error('This verification link is invalid or has already been used.');
    err.statusCode = 404;
    throw err;
  }
  if (reg.emailVerifyExpiresAt && reg.emailVerifyExpiresAt < new Date()) {
    const err = new Error('This verification link has expired — request a new one.');
    err.statusCode = 410;
    throw err;
  }
  const updated = await prisma.corporateRegistration.update({
    where: { id: reg.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiresAt: null },
  });
  return toPublicRegistration(updated);
}

// Final step: the registrant sets a password once both gates (email + HumanCare's
// own compliance approval) have passed — creates the real Corporate + CorporateUser.
async function createCredentials(id, password) {
  const reg = await getRegistrationOr404(id);
  if (reg.credentialsCreated) {
    const err = new Error('Credentials have already been created for this registration.');
    err.statusCode = 409;
    throw err;
  }
  if (!reg.emailVerified || !reg.approved) {
    const err = new Error('Your registration has not been verified yet.');
    err.statusCode = 409;
    throw err;
  }
  const existingUser = await prisma.corporateUser.findUnique({ where: { email: reg.email } });
  if (existingUser) {
    const err = new Error('An account with that email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const c = reg.company;
  const corporate = await prisma.corporate.create({
    data: {
      companyName: c.companyName,
      type: c.companyType,
      registrationNumber: c.registrationNumber || null,
      companyType: c.companyType || null,
      country: c.country || null,
      state: c.state || null,
      city: c.city || null,
      address: c.address || null,
      pincode: c.pincode || null,
      officialEmail: c.officialEmail || null,
      officialPhone: c.officialPhone || null,
      website: c.website || null,
      contactName: c.contactName || null,
      contactDesignation: c.contactDesignation || null,
      contactEmail: c.contactEmail || null,
      contactPhone: c.contactPhone || null,
    },
  });

  const passwordHash = await hashPassword(password);
  const corporateUser = await prisma.corporateUser.create({
    data: { corporateId: corporate.id, email: reg.email, passwordHash },
  });

  const updated = await prisma.corporateRegistration.update({
    where: { id: reg.id },
    data: { credentialsCreated: true, corporateId: corporate.id, corporateUserId: corporateUser.id },
  });

  return toPublicRegistration(updated);
}

module.exports = {
  createRegistration,
  getPublicRegistration,
  resendVerificationEmail,
  changeRegistrationEmail,
  verifyEmailToken,
  createCredentials,
  getRegistrationOr404,
  toAdminRegistration,
  deriveStatus,
};
