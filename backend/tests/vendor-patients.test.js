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

async function createCaseDirect(vendorId, overrides = {}) {
  return prisma.case.create({
    data: {
      vendorId,
      referenceNumber: `CASE-PAT-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      patientName: 'Patient Test',
      patientContact: '9999999999',
      serviceType: 'Air Ambulance',
      origin: 'Mumbai',
      destination: 'Dubai',
      status: 'submitted',
      urgency: 'urgent',
      ...overrides,
    },
  });
}

describe('GET /vendor/patients', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/vendor/patients');
    expect(res.status).toBe(401);
  });

  it("lists this vendor's cases as patients, one per case (not deduplicated)", async () => {
    const { token, vendor } = await createVendorUserAndLogin();
    await createCaseDirect(vendor.id, { patientContact: 'same-contact' });
    await createCaseDirect(vendor.id, { patientContact: 'same-contact' }); // same patient, 2nd case

    const res = await request(app).get('/vendor/patients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // matches the vendor-portal's own mock behaviour
    expect(res.body[0].id).toMatch(/^HCW-PAT-\d+$/);
  });

  it("doesn't show another vendor's patients", async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Patients Vendor A' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Patients Vendor B' });
    await createCaseDirect(vendorA.vendor.id);

    const resB = await request(app).get('/vendor/patients').set('Authorization', `Bearer ${vendorB.token}`);
    expect(resB.body).toHaveLength(0);
  });
});

describe('GET /vendor/patients/:id', () => {
  it('maps urgency to a condition label and includes documents + communications', async () => {
    const { token, vendor } = await createVendorUserAndLogin();
    const caseRecord = await createCaseDirect(vendor.id, { urgency: 'critical' });
    const listRes = await request(app).get('/vendor/patients').set('Authorization', `Bearer ${token}`);
    const patientId = listRes.body.find((p) => p.caseId === caseRecord.referenceNumber).id;

    const res = await request(app).get(`/vendor/patients/${patientId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.condition).toBe('Critical');
    expect(res.body.documents).toEqual([]);
    expect(res.body.communications).toEqual([]);
  });

  it("404s for a patient id belonging to another vendor's case", async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Patients Vendor C' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Patients Vendor D' });
    const caseRecord = await createCaseDirect(vendorA.vendor.id);
    const patientId = `HCW-PAT-${String(caseRecord.id).padStart(5, '0')}`;

    const res = await request(app).get(`/vendor/patients/${patientId}`).set('Authorization', `Bearer ${vendorB.token}`);
    expect(res.status).toBe(404);
  });

  it('404s for a malformed patient id', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).get('/vendor/patients/not-a-real-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /vendor/patients/:id/communications', () => {
  it('adds a communication entry visible on the next detail fetch', async () => {
    const { token, vendor } = await createVendorUserAndLogin();
    const caseRecord = await createCaseDirect(vendor.id);
    const patientId = `HCW-PAT-${String(caseRecord.id).padStart(5, '0')}`;

    const addRes = await request(app)
      .post(`/vendor/patients/${patientId}/communications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ summary: 'Called to confirm pickup time.', channel: 'Phone' });
    expect(addRes.status).toBe(201);
    expect(addRes.body.summary).toBe('Called to confirm pickup time.');

    const detailRes = await request(app).get(`/vendor/patients/${patientId}`).set('Authorization', `Bearer ${token}`);
    expect(detailRes.body.communications).toHaveLength(1);
  });

  it('rejects a missing summary/channel', async () => {
    const { token, vendor } = await createVendorUserAndLogin();
    const caseRecord = await createCaseDirect(vendor.id);
    const patientId = `HCW-PAT-${String(caseRecord.id).padStart(5, '0')}`;

    const res = await request(app)
      .post(`/vendor/patients/${patientId}/communications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ summary: 'Missing channel' });
    expect(res.status).toBe(400);
  });
});
