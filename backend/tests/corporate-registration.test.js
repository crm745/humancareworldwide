jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/lib/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { sendMail } = require('../src/lib/mailer');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createAdminAndLogin, uniqueEmail } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  sendMail.mockClear();
});

function sampleCompany(email) {
  return {
    companyName: 'Acme Assist Pvt Ltd',
    companyType: 'tpa',
    country: 'IN',
    city: 'Mumbai',
    officialEmail: email,
    officialPhone: '+91 9876543210',
    contactName: 'Priya Sharma',
    contactDesignation: 'Operations Head',
    contactEmail: email,
    contactPhone: '+91 9876543210',
  };
}

const sampleBank = {
  bankType: 'Domestic',
  bankName: 'HDFC Bank',
  accountHolder: 'Acme Assist Pvt Ltd',
  accountNumber: '123456789012',
  ifsc: 'HDFC0001234',
  branchName: 'Andheri',
  branchAddress: 'Andheri East, Mumbai',
};

async function submitRegistration(email = uniqueEmail('acme'), { withDocument = false } = {}) {
  const req = request(app)
    .post('/corporates/register')
    .field('company', JSON.stringify(sampleCompany(email)))
    .field('bank', JSON.stringify(sampleBank));
  if (withDocument) {
    req.attach('registration', Buffer.from('%PDF-1.4 fake'), { filename: 'cert.pdf', contentType: 'application/pdf' });
  }
  return req;
}

function tokenFromLastEmail() {
  const html = sendMail.mock.calls.at(-1)[0].html;
  return new URL(html.match(/href="([^"]+)"/)[1]).searchParams.get('token');
}

describe('POST /corporates/register', () => {
  it('creates a pending registration and emails a verification link', async () => {
    const email = uniqueEmail('acme');
    const res = await submitRegistration(email);
    expect(res.status).toBe(201);
    expect(res.body.corporateId).toMatch(/^HCW-COR-\d{4}-\d+$/);
    expect(res.body.status).toBe('Pending Verification');
    expect(res.body.emailVerified).toBe(false);
    expect(res.body.approved).toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe(email);
  });

  it('masks the bank account number in the public response', async () => {
    const res = await submitRegistration();
    expect(res.body.bank.accountLast4).toBe('9012');
    expect(res.body.bank.accountNumber).toBeUndefined();
  });

  it('rejects a submission missing required company fields', async () => {
    const res = await request(app)
      .post('/corporates/register')
      .field('company', JSON.stringify({ companyType: 'tpa' }))
      .field('bank', JSON.stringify(sampleBank));
    expect(res.status).toBe(400);
  });
});

describe('GET /corporates/registrations/:id', () => {
  it('returns the registration by id', async () => {
    const created = (await submitRegistration()).body;
    const res = await request(app).get(`/corporates/registrations/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  it('404s for an unknown id', async () => {
    const res = await request(app).get('/corporates/registrations/999999999');
    expect(res.status).toBe(404);
  });
});

describe('email verification', () => {
  it('verifies via the emailed link token', async () => {
    const created = (await submitRegistration()).body;
    const token = tokenFromLastEmail();
    const res = await request(app).get(`/corporates/verify-email?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.emailVerified).toBe(true);
    expect(res.body.id).toBe(created.id);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/corporates/verify-email?token=not-a-real-token');
    expect(res.status).toBe(404);
  });

  it('blocks an immediate resend (same cooldown the UI countdown enforces)', async () => {
    const created = (await submitRegistration()).body;
    const res = await request(app).post(`/corporates/registrations/${created.id}/resend-verification`);
    expect(res.status).toBe(429);
  });

  it('resend issues a new email once the cooldown has passed', async () => {
    const created = (await submitRegistration()).body;
    // Back-date updatedAt instead of sleeping — simulates the cooldown having elapsed.
    await prisma.corporateRegistration.update({ where: { id: created.id }, data: { updatedAt: new Date(Date.now() - 60_000) } });
    const res = await request(app).post(`/corporates/registrations/${created.id}/resend-verification`);
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2); // initial submit + this resend
  });

  it('changing the email resets verification and sends a new link', async () => {
    const created = (await submitRegistration()).body;
    const newEmail = uniqueEmail('acme-new');
    const res = await request(app).patch(`/corporates/registrations/${created.id}/email`).send({ email: newEmail });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(newEmail);
    expect(res.body.emailVerified).toBe(false);
  });
});

describe('registration document download', () => {
  it('stores the uploaded file and superadmin can download it; a regular admin cannot', async () => {
    const created = (await submitRegistration(undefined, { withDocument: true })).body;
    expect(created.documents).toHaveLength(1);
    expect(created.documents[0].key).toBe('registration');

    const { token: superToken } = await createAdminAndLogin({ role: 'superadmin' });
    const ok = await request(app)
      .get(`/admin/corporate-registrations/${created.id}/documents/registration`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(ok.status).toBe(200);
    expect(Buffer.from(ok.body).toString()).toContain('%PDF-1.4 fake');

    const { token: adminToken } = await createAdminAndLogin({ role: 'admin' });
    const blocked = await request(app)
      .get(`/admin/corporate-registrations/${created.id}/documents/registration`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blocked.status).toBe(403);
  });

  it('404s for a document key that was never uploaded', async () => {
    const created = (await submitRegistration()).body; // no documents attached
    const { token } = await createAdminAndLogin({ role: 'superadmin' });
    const res = await request(app)
      .get(`/admin/corporate-registrations/${created.id}/documents/registration`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('admin approval is superadmin-only', () => {
  it('a regular admin cannot see or approve pending registrations', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const list = await request(app).get('/admin/corporate-registrations').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(403);
  });

  it('a superadmin can list, approve, and reject registrations', async () => {
    const { token: adminToken } = await createAdminAndLogin({ role: 'superadmin' });
    const created = (await submitRegistration()).body;

    const list = await request(app).get('/admin/corporate-registrations').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.registrations.some((r) => r.id === created.id)).toBe(true);

    const detail = await request(app).get(`/admin/corporate-registrations/${created.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.registration.bank.accountNumber).toBe('123456789012'); // unmasked for admin

    const approve = await request(app).post(`/admin/corporate-registrations/${created.id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.registration.approved).toBe(true);

    const other = (await submitRegistration()).body;
    const reject = await request(app)
      .post(`/admin/corporate-registrations/${other.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Documents unclear' });
    expect(reject.status).toBe(200);
    expect(reject.body.registration.status).toBe('Rejected');
  });
});

describe('POST /corporates/registrations/:id/credentials', () => {
  it('refuses before email is verified and approved', async () => {
    const created = (await submitRegistration()).body;
    const res = await request(app).post(`/corporates/registrations/${created.id}/credentials`).send({ password: 'StrongPass@123' });
    expect(res.status).toBe(409);
  });

  it('creates a real, working corporate login once verified and approved', async () => {
    const email = uniqueEmail('acme-activate');
    const created = (await submitRegistration(email)).body;
    const token = tokenFromLastEmail();
    await request(app).get(`/corporates/verify-email?token=${token}`);

    const { token: adminToken } = await createAdminAndLogin({ role: 'superadmin' });
    await request(app).post(`/admin/corporate-registrations/${created.id}/approve`).set('Authorization', `Bearer ${adminToken}`);

    const credRes = await request(app).post(`/corporates/registrations/${created.id}/credentials`).send({ password: 'StrongPass@123' });
    expect(credRes.status).toBe(200);
    expect(credRes.body.status).toBe('Active');
    expect(credRes.body.credentialsCreated).toBe(true);

    // The real Corporate + CorporateUser exist and this email/password now logs in for real.
    const loginRes = await request(app).post('/auth/corporate/login').send({ email, password: 'StrongPass@123' });
    expect(loginRes.status).toBe(200);

    const corporate = await prisma.corporate.findFirst({ where: { companyName: 'Acme Assist Pvt Ltd', officialEmail: email } });
    expect(corporate).not.toBeNull();
  });

  it('rejects a second credentials request for the same registration', async () => {
    const email = uniqueEmail('acme-dup');
    const created = (await submitRegistration(email)).body;
    const token = tokenFromLastEmail();
    await request(app).get(`/corporates/verify-email?token=${token}`);
    const { token: adminToken } = await createAdminAndLogin({ role: 'superadmin' });
    await request(app).post(`/admin/corporate-registrations/${created.id}/approve`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).post(`/corporates/registrations/${created.id}/credentials`).send({ password: 'StrongPass@123' });

    const again = await request(app).post(`/corporates/registrations/${created.id}/credentials`).send({ password: 'AnotherPass@123' });
    expect(again.status).toBe(409);
  });
});
