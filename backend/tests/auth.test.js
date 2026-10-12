// Mock the OTP delivery service so tests never hit real Twilio/SendGrid — and so we
// can read back the plaintext code a test triggered (it's only ever stored bcrypt-hashed).
jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { deliverOtp } = require('../src/modules/auth/otp-delivery.service');
const { createVendorUserAndLogin } = require('./helpers');

// Each test run uses a fresh, unique mobile/email so tests never collide with each
// other or with leftover data from a previous run.
function uniqueMobile() {
  return `9${Date.now().toString().slice(-9)}`;
}
function uniqueEmail() {
  return `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

// Finds the MOST RECENT call for this identifier — a test flow can trigger more than
// one OTP to the same identifier (e.g. a login OTP during setup, then a separate
// password-reset OTP later), and it's always the latest one that's still valid.
function codeSentTo(identifier) {
  const calls = deliverOtp.mock.calls.filter((c) => c[0] === identifier);
  return calls[calls.length - 1]?.[1];
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/register/request-otp', () => {
  it('rejects a request missing required fields', async () => {
    const res = await request(app).post('/auth/register/request-otp').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects a disposable email domain', async () => {
    const res = await request(app)
      .post('/auth/register/request-otp')
      .send({ name: 'Test User', email: 'someone@mailinator.com', mobile: uniqueMobile() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/temporary|disposable/i);
  });

  it('sends an OTP for a valid new registration', async () => {
    const mobile = uniqueMobile();
    const res = await request(app)
      .post('/auth/register/request-otp')
      .send({ name: 'Test User', email: uniqueEmail(), mobile });
    expect(res.status).toBe(200);
    expect(codeSentTo(mobile)).toMatch(/^\d{6}$/);
  });

  // Regression test for a real bug: the SMS-sending step used to hardcode +91 for
  // every registration regardless of which country code the person actually picked,
  // so a UAE/UK/US number would get sent to the wrong country entirely.
  it('passes the actual selected country code through to OTP delivery, not a hardcoded one', async () => {
    const mobile = uniqueMobile();
    await request(app)
      .post('/auth/register/request-otp')
      .send({ name: 'UAE Test User', email: uniqueEmail(), mobile, countryCode: '+971' });

    const call = deliverOtp.mock.calls.find((c) => c[0] === mobile);
    expect(call[3]).toBe('+971'); // deliverOtp(identifier, code, purpose, countryCode)
  });
});

describe('full register -> verify flow', () => {
  it('creates an account with a correct OTP, and rejects a repeat registration', async () => {
    const mobile = uniqueMobile();
    const email = uniqueEmail();

    await request(app).post('/auth/register/request-otp').send({ name: 'Flow Test', email, mobile });
    const code = codeSentTo(mobile);

    const verifyRes = await request(app)
      .post('/auth/register/verify-otp')
      .send({ name: 'Flow Test', email, mobile, code });
    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.token).toBeTruthy();
    expect(verifyRes.body.user.mobile).toBe(mobile);

    // Same email/mobile again should now be rejected as a duplicate account.
    const dupeRes = await request(app)
      .post('/auth/register/request-otp')
      .send({ name: 'Flow Test', email, mobile });
    expect(dupeRes.status).toBe(409);
  });

  it('rejects an incorrect OTP and locks out after 5 wrong attempts', async () => {
    const mobile = uniqueMobile();
    const email = uniqueEmail();
    await request(app).post('/auth/register/request-otp').send({ name: 'Lockout Test', email, mobile });

    let lastRes;
    for (let i = 0; i < 5; i++) {
      lastRes = await request(app)
        .post('/auth/register/verify-otp')
        .send({ name: 'Lockout Test', email, mobile, code: '000000' });
      expect(lastRes.status).toBe(401);
    }
    expect(lastRes.body.error).toMatch(/too many/i);

    // Even the real code should now be rejected, since the OTP record is locked out.
    const code = codeSentTo(mobile);
    const finalRes = await request(app)
      .post('/auth/register/verify-otp')
      .send({ name: 'Lockout Test', email, mobile, code });
    expect(finalRes.status).toBe(401);
  });
});

describe('login identifier matching works regardless of country-code prefix', () => {
  it('logs in whether or not the stored mobile is typed with a country code', async () => {
    const mobile = uniqueMobile();
    const email = uniqueEmail();
    await request(app).post('/auth/register/request-otp').send({ name: 'CC Test', email, mobile });
    const regCode = codeSentTo(mobile);
    await request(app).post('/auth/register/verify-otp').send({ name: 'CC Test', email, mobile, code: regCode });

    // Login by typing the mobile WITH a +91 prefix, even though it's stored without one.
    const loginReq = await request(app).post('/auth/login/request-otp').send({ identifier: `+91${mobile}` });
    expect(loginReq.status).toBe(200);
    const loginCode = codeSentTo(`+91${mobile}`);
    expect(loginCode).toMatch(/^\d{6}$/);

    const loginVerify = await request(app)
      .post('/auth/login/verify-otp')
      .send({ identifier: `+91${mobile}`, code: loginCode });
    expect(loginVerify.status).toBe(200);
    expect(loginVerify.body.token).toBeTruthy();
  });
});

describe('GET /auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/invalid token', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

// These /vendor/* paths are aliases added for the vendor-portal web app (2026-10-12) —
// same handlers as the originals, just reachable under a name that app expects.
describe('vendor-portal auth aliases', () => {
  it('forgot-password alias triggers the same OTP flow as the original route', async () => {
    const { email } = await createVendorUserAndLogin();
    const res = await request(app).post('/auth/vendor/forgot-password').send({ email });
    expect(res.status).toBe(200);
    expect(codeSentTo(email)).toMatch(/^\d{6}$/);
  });

  it('reset-password alias resets the password with a correct OTP', async () => {
    const { email } = await createVendorUserAndLogin();
    await request(app).post('/auth/vendor/forgot-password').send({ email });
    const code = codeSentTo(email);

    const res = await request(app)
      .post('/auth/vendor/reset-password')
      .send({ email, code, newPassword: 'BrandNewPass@123' });
    expect(res.status).toBe(200);

    // The old password should no longer work. (Not re-testing the new one through a
    // full login here — that would issue a 2nd "vendor_login" OTP for this email
    // within the 30s resend cooldown already started by createVendorUserAndLogin's
    // own setup call, and get throttled rather than actually proving anything.)
    const oldLoginRes = await request(app).post('/auth/vendor/login').send({ email, password: 'TestPass@123' });
    expect(oldLoginRes.status).toBe(401);
  });
});

describe('POST /auth/vendor/change-password', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/auth/vendor/change-password').send({ currentPassword: 'a', newPassword: 'b' });
    expect(res.status).toBe(401);
  });

  it('rejects an incorrect current password', async () => {
    const { token } = await createVendorUserAndLogin({ password: 'OriginalPass@123' });
    const res = await request(app)
      .post('/auth/vendor/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPass@123', newPassword: 'NewPass@456' });
    expect(res.status).toBe(400);
  });

  it('changes the password with the correct current password', async () => {
    const { token, email } = await createVendorUserAndLogin({ password: 'OriginalPass@123' });
    const res = await request(app)
      .post('/auth/vendor/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OriginalPass@123', newPassword: 'NewPass@456' });
    expect(res.status).toBe(200);

    // Same reasoning as the reset-password test above: confirm via the OLD password
    // now failing, rather than re-triggering a throttled login OTP for the new one.
    const oldLoginRes = await request(app).post('/auth/vendor/login').send({ email, password: 'OriginalPass@123' });
    expect(oldLoginRes.status).toBe(401);
  });
});

describe('POST /auth/vendor/logout', () => {
  it('always succeeds (JWTs are stateless, there is nothing server-side to clear)', async () => {
    const res = await request(app).post('/auth/vendor/logout');
    expect(res.status).toBe(200);
  });
});
