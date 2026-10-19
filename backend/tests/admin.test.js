jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createAdminAndLogin } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /admin/login', () => {
  it('rejects a wrong password', async () => {
    const { email } = await createAdminAndLogin({ password: 'CorrectPass@123' });
    const res = await request(app).post('/admin/login').send({ email, password: 'WrongPass@123' });
    expect(res.status).toBe(401);
  });

  it('accepts the correct password and returns a token', async () => {
    const { token } = await createAdminAndLogin();
    expect(token).toBeTruthy();
  });
});

describe('admin-only routes require an admin token', () => {
  it('rejects GET /admin/corporates with no token', async () => {
    const res = await request(app).get('/admin/corporates');
    expect(res.status).toBe(401);
  });

  it('lets an authenticated admin manage corporates', async () => {
    const { token } = await createAdminAndLogin();

    const createRes = await request(app)
      .post('/admin/corporates')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'New Co', type: 'tpa' });
    expect(createRes.status).toBe(201);

    const userRes = await request(app)
      .post(`/admin/corporates/${createRes.body.corporate.id}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: `corporateuser-${Date.now()}@example.com`, password: 'ShortPw' });
    expect(userRes.status).toBe(400); // password under 8 chars

    const listRes = await request(app).get('/admin/corporates').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.corporates.some((v) => v.id === createRes.body.corporate.id)).toBe(true);
  });

  it('lists cases and patients', async () => {
    const { token } = await createAdminAndLogin();
    const casesRes = await request(app).get('/admin/cases').set('Authorization', `Bearer ${token}`);
    expect(casesRes.status).toBe(200);

    const patientsRes = await request(app).get('/admin/patients').set('Authorization', `Bearer ${token}`);
    expect(patientsRes.status).toBe(200);
    expect(patientsRes.body.patients.every((p) => !('passwordHash' in p))).toBe(true);
  });
});

describe('PATCH /admin/cases/:id/stage', () => {
  it('rejects an invalid stage value', async () => {
    const { token } = await createAdminAndLogin();
    const corporate = await prisma.corporate.create({ data: { companyName: 'Stage Test Co', type: 'corporate' } });
    const caseRecord = await prisma.case.create({
      data: {
        corporateId: corporate.id,
        referenceNumber: `CASE-TEST-${Date.now()}`,
        patientName: 'Stage Test Patient',
        serviceType: 'Air Ambulance',
        origin: 'A',
        destination: 'B',
        status: 'submitted',
      },
    });

    const res = await request(app)
      .patch(`/admin/cases/${caseRecord.id}/stage`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stage: 'not_a_real_stage' });
    expect(res.status).toBe(400);
  });
});

describe('admin-account management is superadmin-only', () => {
  it('rejects a regular admin trying to list admin accounts', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const res = await request(app).get('/admin/admins').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a regular admin trying to create an admin account', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const res = await request(app)
      .post('/admin/admins')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Not Work', email: `blocked-${Date.now()}@example.com`, password: 'SomePass@123' });
    expect(res.status).toBe(403);
  });

  it('lets a superadmin list, create, and delete admin accounts', async () => {
    const { token } = await createAdminAndLogin({ role: 'superadmin' });

    const listRes = await request(app).get('/admin/admins').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.admins)).toBe(true);

    const email = `new-admin-${Date.now()}@example.com`;
    const createRes = await request(app)
      .post('/admin/admins')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Admin', email, password: 'NewAdminPass@123' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.admin.role).toBe('admin'); // defaults to the lower tier
    expect(createRes.body.admin.passwordHash).toBeUndefined();

    // The newly created admin account can actually log in.
    const newAdminLogin = await request(app).post('/admin/login').send({ email, password: 'NewAdminPass@123' });
    expect(newAdminLogin.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/admin/admins/${createRes.body.admin.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);
  });

  it('rejects creating a second admin with an already-used email', async () => {
    const { token } = await createAdminAndLogin({ role: 'superadmin' });
    const { email } = await createAdminAndLogin({ role: 'admin' });
    const res = await request(app)
      .post('/admin/admins')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate', email, password: 'SomePass@123' });
    expect(res.status).toBe(409);
  });

  it('refuses to let a superadmin delete their own account', async () => {
    const { token, email } = await createAdminAndLogin({ role: 'superadmin' });
    const me = await request(app).get('/admin/me').set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .delete(`/admin/admins/${me.body.admin.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('billing', () => {
  async function createTestCase() {
    return prisma.case.create({
      data: {
        referenceNumber: `CASE-BILL-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        patientName: 'Billing Test Patient',
        serviceType: 'Air Ambulance',
        origin: 'Mumbai',
        destination: 'Dubai',
        status: 'submitted',
      },
    });
  }

  it('a regular admin can view and update billing (not a sensitive-settings action)', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const caseRecord = await createTestCase();

    const list = await request(app).get('/admin/billing').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const row = list.body.cases.find((c) => c.id === caseRecord.id);
    expect(row.billingStatus).toBe('pending');
    expect(row.billingAmount).toBeNull();

    const update = await request(app)
      .patch(`/admin/cases/${caseRecord.id}/billing`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1250.5, currency: 'USD', status: 'invoiced', notes: 'Sent via email' });
    expect(update.status).toBe(200);
    expect(update.body.case.billingAmount).toBe(1250.5);
    expect(update.body.case.billingCurrency).toBe('USD');
    expect(update.body.case.billingStatus).toBe('invoiced');
    expect(update.body.case.billingInvoicedAt).not.toBeNull();
    expect(update.body.case.billingPaidAt).toBeNull();
  });

  it('stamps billingPaidAt the first time status becomes paid, and does not overwrite it later', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const caseRecord = await createTestCase();

    const first = await request(app)
      .patch(`/admin/cases/${caseRecord.id}/billing`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });
    const firstPaidAt = first.body.case.billingPaidAt;
    expect(firstPaidAt).not.toBeNull();

    const second = await request(app)
      .patch(`/admin/cases/${caseRecord.id}/billing`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Confirmed with finance' });
    expect(second.body.case.billingPaidAt).toBe(firstPaidAt);
  });

  it('rejects an invalid billing status', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const caseRecord = await createTestCase();
    const res = await request(app)
      .patch(`/admin/cases/${caseRecord.id}/billing`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'not_a_real_status' });
    expect(res.status).toBe(400);
  });

  it('filters the billing list by status', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const caseRecord = await createTestCase();
    await request(app).patch(`/admin/cases/${caseRecord.id}/billing`).set('Authorization', `Bearer ${token}`).send({ status: 'overdue' });

    const res = await request(app).get('/admin/billing?status=overdue').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.cases.every((c) => c.billingStatus === 'overdue')).toBe(true);
    expect(res.body.cases.some((c) => c.id === caseRecord.id)).toBe(true);
  });

  it('404s updating billing for a case that does not exist', async () => {
    const { token } = await createAdminAndLogin({ role: 'admin' });
    const res = await request(app)
      .patch('/admin/cases/999999999/billing')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });
    expect(res.status).toBe(404);
  });
});
