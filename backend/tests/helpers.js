// Shared helpers so every test file doesn't re-implement "create a logged-in patient".
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { deliverOtp } = require('../src/modules/auth/otp-delivery.service');

function uniqueMobile() {
  return `9${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
}
function uniqueEmail(tag = 'test') {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

function codeSentTo(identifier) {
  const call = deliverOtp.mock.calls.find((c) => c[0] === identifier);
  return call?.[call.length > 0 ? 1 : 0];
}

// Registers a brand-new patient through the real OTP flow and returns their token.
async function createPatient({ name = 'Test Patient' } = {}) {
  const mobile = uniqueMobile();
  const email = uniqueEmail('patient');
  await request(app).post('/auth/register/request-otp').send({ name, email, mobile });
  const code = codeSentTo(mobile);
  const res = await request(app).post('/auth/register/verify-otp').send({ name, email, mobile, code });
  return { token: res.body.token, user: res.body.user, mobile, email };
}

// Creates a vendor + vendor login directly (there's no public vendor sign-up endpoint —
// real vendor accounts are created by an admin), then logs in through the real
// password+OTP flow to get a token, same as the app does.
async function createVendorUserAndLogin({ companyName = 'Test Vendor Co', type = 'corporate', password = 'TestPass@123' } = {}) {
  const vendor = await prisma.vendor.create({ data: { companyName, type } });
  const email = uniqueEmail('vendor');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.vendorUser.create({ data: { vendorId: vendor.id, email, passwordHash, role: 'admin' } });

  await request(app).post('/auth/vendor/login').send({ email, password });
  const code = codeSentTo(email);
  const res = await request(app).post('/auth/vendor/otp/verify').send({ email, code });
  return { token: res.body.token, vendorUser: res.body.vendorUser, vendor, email };
}

async function createAdminAndLogin({ password = 'TestAdminPass@123' } = {}) {
  const email = uniqueEmail('admin');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.create({ data: { name: 'Test Admin', email, passwordHash } });
  const res = await request(app).post('/admin/login').send({ email, password });
  return { token: res.body.token, email };
}

module.exports = {
  uniqueMobile,
  uniqueEmail,
  codeSentTo,
  createPatient,
  createVendorUserAndLogin,
  createAdminAndLogin,
};
