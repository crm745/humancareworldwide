jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createCorporateUserAndLogin } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

async function createCaseDirect(corporateId, overrides = {}) {
  return prisma.case.create({
    data: {
      corporateId,
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

describe('GET /corporate/patients', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/corporate/patients');
    expect(res.status).toBe(401);
  });

  it("lists this corporate's cases as patients, one per case (not deduplicated)", async () => {
    const { token, corporate } = await createCorporateUserAndLogin();
    await createCaseDirect(corporate.id, { patientContact: 'same-contact' });
    await createCaseDirect(corporate.id, { patientContact: 'same-contact' }); // same patient, 2nd case

    const res = await request(app).get('/corporate/patients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // matches the corporate-portal's own mock behaviour
    expect(res.body[0].id).toMatch(/^HCW-PAT-\d+$/);
  });

  it("doesn't show another corporate's patients", async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Patients Corporate A' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Patients Corporate B' });
    await createCaseDirect(corporateA.corporate.id);

    const resB = await request(app).get('/corporate/patients').set('Authorization', `Bearer ${corporateB.token}`);
    expect(resB.body).toHaveLength(0);
  });
});

describe('GET /corporate/patients/:id', () => {
  it('maps urgency to a condition label and includes documents + communications', async () => {
    const { token, corporate } = await createCorporateUserAndLogin();
    const caseRecord = await createCaseDirect(corporate.id, { urgency: 'critical' });
    const listRes = await request(app).get('/corporate/patients').set('Authorization', `Bearer ${token}`);
    const patientId = listRes.body.find((p) => p.caseId === caseRecord.referenceNumber).id;

    const res = await request(app).get(`/corporate/patients/${patientId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.condition).toBe('Critical');
    expect(res.body.documents).toEqual([]);
    expect(res.body.communications).toEqual([]);
  });

  it("404s for a patient id belonging to another corporate's case", async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Patients Corporate C' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Patients Corporate D' });
    const caseRecord = await createCaseDirect(corporateA.corporate.id);
    const patientId = `HCW-PAT-${String(caseRecord.id).padStart(5, '0')}`;

    const res = await request(app).get(`/corporate/patients/${patientId}`).set('Authorization', `Bearer ${corporateB.token}`);
    expect(res.status).toBe(404);
  });

  it('404s for a malformed patient id', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).get('/corporate/patients/not-a-real-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /corporate/patients/:id/communications', () => {
  it('adds a communication entry visible on the next detail fetch', async () => {
    const { token, corporate } = await createCorporateUserAndLogin();
    const caseRecord = await createCaseDirect(corporate.id);
    const patientId = `HCW-PAT-${String(caseRecord.id).padStart(5, '0')}`;

    const addRes = await request(app)
      .post(`/corporate/patients/${patientId}/communications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ summary: 'Called to confirm pickup time.', channel: 'Phone' });
    expect(addRes.status).toBe(201);
    expect(addRes.body.summary).toBe('Called to confirm pickup time.');

    const detailRes = await request(app).get(`/corporate/patients/${patientId}`).set('Authorization', `Bearer ${token}`);
    expect(detailRes.body.communications).toHaveLength(1);
  });

  it('rejects a missing summary/channel', async () => {
    const { token, corporate } = await createCorporateUserAndLogin();
    const caseRecord = await createCaseDirect(corporate.id);
    const patientId = `HCW-PAT-${String(caseRecord.id).padStart(5, '0')}`;

    const res = await request(app)
      .post(`/corporate/patients/${patientId}/communications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ summary: 'Missing channel' });
    expect(res.status).toBe(400);
  });
});
