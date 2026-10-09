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
  it('rejects GET /admin/vendors with no token', async () => {
    const res = await request(app).get('/admin/vendors');
    expect(res.status).toBe(401);
  });

  it('lets an authenticated admin manage vendors', async () => {
    const { token } = await createAdminAndLogin();

    const createRes = await request(app)
      .post('/admin/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'New Co', type: 'tpa' });
    expect(createRes.status).toBe(201);

    const userRes = await request(app)
      .post(`/admin/vendors/${createRes.body.vendor.id}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: `vendoruser-${Date.now()}@example.com`, password: 'ShortPw' });
    expect(userRes.status).toBe(400); // password under 8 chars

    const listRes = await request(app).get('/admin/vendors').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.vendors.some((v) => v.id === createRes.body.vendor.id)).toBe(true);
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
    const vendor = await prisma.vendor.create({ data: { companyName: 'Stage Test Co', type: 'corporate' } });
    const caseRecord = await prisma.case.create({
      data: {
        vendorId: vendor.id,
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
