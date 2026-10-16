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

const baseCaseBody = {
  patientName: 'Jane Smith',
  serviceType: 'Ground Ambulance',
  origin: 'Delhi, India',
  destination: 'Singapore',
};

describe('POST /corporate/cases', () => {
  it('requires corporate authentication', async () => {
    const res = await request(app).post('/corporate/cases').send(baseCaseBody);
    expect(res.status).toBe(401);
  });

  it('rejects a case missing required fields', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app)
      .post('/corporate/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ patientName: 'Jane Smith' });
    expect(res.status).toBe(400);
  });

  it('creates a case with a CASE- reference number', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app)
      .post('/corporate/cases')
      .set('Authorization', `Bearer ${token}`)
      .send(baseCaseBody);
    expect(res.status).toBe(201);
    expect(res.body.case.referenceNumber).toMatch(/^CASE-/);
  });
});

describe('corporate case isolation', () => {
  it('only lists a corporate\'s own cases, and refuses to show another corporate\'s case detail', async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Corporate A' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Corporate B' });

    const createRes = await request(app)
      .post('/corporate/cases')
      .set('Authorization', `Bearer ${corporateA.token}`)
      .send(baseCaseBody);
    const caseId = createRes.body.case.id;

    const listA = await request(app).get('/corporate/cases').set('Authorization', `Bearer ${corporateA.token}`);
    expect(listA.body.cases.some((c) => c.id === caseId)).toBe(true);

    const listB = await request(app).get('/corporate/cases').set('Authorization', `Bearer ${corporateB.token}`);
    expect(listB.body.cases.some((c) => c.id === caseId)).toBe(false);

    const detailB = await request(app).get(`/corporate/cases/${caseId}`).set('Authorization', `Bearer ${corporateB.token}`);
    expect(detailB.status).toBe(403);
  });

  it('accepts a document upload against its own case', async () => {
    const corporate = await createCorporateUserAndLogin();
    const createRes = await request(app)
      .post('/corporate/cases')
      .set('Authorization', `Bearer ${corporate.token}`)
      .send(baseCaseBody);
    const caseId = createRes.body.case.id;

    const uploadRes = await request(app)
      .post(`/corporate/cases/${caseId}/documents`)
      .set('Authorization', `Bearer ${corporate.token}`)
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'policy.pdf', contentType: 'application/pdf' });
    expect(uploadRes.status).toBe(201);
  });
});
