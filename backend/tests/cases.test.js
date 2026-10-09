jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createVendorUserAndLogin } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

const baseCaseBody = {
  patientName: 'Jane Smith',
  serviceType: 'Ground Ambulance',
  origin: 'Delhi, India',
  destination: 'Singapore',
};

describe('POST /vendor/cases', () => {
  it('requires vendor authentication', async () => {
    const res = await request(app).post('/vendor/cases').send(baseCaseBody);
    expect(res.status).toBe(401);
  });

  it('rejects a case missing required fields', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app)
      .post('/vendor/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ patientName: 'Jane Smith' });
    expect(res.status).toBe(400);
  });

  it('creates a case with a CASE- reference number', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app)
      .post('/vendor/cases')
      .set('Authorization', `Bearer ${token}`)
      .send(baseCaseBody);
    expect(res.status).toBe(201);
    expect(res.body.case.referenceNumber).toMatch(/^CASE-/);
  });
});

describe('vendor case isolation', () => {
  it('only lists a vendor\'s own cases, and refuses to show another vendor\'s case detail', async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Vendor A' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Vendor B' });

    const createRes = await request(app)
      .post('/vendor/cases')
      .set('Authorization', `Bearer ${vendorA.token}`)
      .send(baseCaseBody);
    const caseId = createRes.body.case.id;

    const listA = await request(app).get('/vendor/cases').set('Authorization', `Bearer ${vendorA.token}`);
    expect(listA.body.cases.some((c) => c.id === caseId)).toBe(true);

    const listB = await request(app).get('/vendor/cases').set('Authorization', `Bearer ${vendorB.token}`);
    expect(listB.body.cases.some((c) => c.id === caseId)).toBe(false);

    const detailB = await request(app).get(`/vendor/cases/${caseId}`).set('Authorization', `Bearer ${vendorB.token}`);
    expect(detailB.status).toBe(403);
  });

  it('accepts a document upload against its own case', async () => {
    const vendor = await createVendorUserAndLogin();
    const createRes = await request(app)
      .post('/vendor/cases')
      .set('Authorization', `Bearer ${vendor.token}`)
      .send(baseCaseBody);
    const caseId = createRes.body.case.id;

    const uploadRes = await request(app)
      .post(`/vendor/cases/${caseId}/documents`)
      .set('Authorization', `Bearer ${vendor.token}`)
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'policy.pdf', contentType: 'application/pdf' });
    expect(uploadRes.status).toBe(201);
  });
});
