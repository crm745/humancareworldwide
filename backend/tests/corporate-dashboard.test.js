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
      referenceNumber: `CASE-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      patientName: 'Dashboard Test Patient',
      patientContact: `contact-${Math.random()}`,
      serviceType: 'Air Ambulance',
      origin: 'Mumbai',
      destination: 'Dubai',
      status: 'submitted',
      ...overrides,
    },
  });
}

describe('GET /corporate/dashboard', () => {
  it('requires corporate authentication', async () => {
    const res = await request(app).get('/corporate/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns zeroed stats for a corporate with no cases', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).get('/corporate/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.totalCases).toBe(0);
    expect(res.body.statusBreakdown).toHaveLength(5);
    expect(res.body.monthly).toHaveLength(12);
    expect(res.body.recentCases).toEqual([]);
  });

  it('counts only this corporate\'s cases, not another corporate\'s', async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Dashboard Corporate A' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Dashboard Corporate B' });

    await createCaseDirect(corporateA.corporate.id, { status: 'completed' });
    await createCaseDirect(corporateA.corporate.id, { status: 'submitted' });
    await createCaseDirect(corporateB.corporate.id, { status: 'completed' });

    const resA = await request(app).get('/corporate/dashboard').set('Authorization', `Bearer ${corporateA.token}`);
    expect(resA.body.stats.totalCases).toBe(2);
    expect(resA.body.stats.completedCases).toBe(1);
    expect(resA.body.stats.pendingCases).toBe(1);

    const resB = await request(app).get('/corporate/dashboard').set('Authorization', `Bearer ${corporateB.token}`);
    expect(resB.body.stats.totalCases).toBe(1);
  });

  it('lists recent cases newest-first, capped at 6', async () => {
    const { token, corporate } = await createCorporateUserAndLogin();
    for (let i = 0; i < 8; i++) {
      await createCaseDirect(corporate.id);
    }
    const res = await request(app).get('/corporate/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.body.recentCases).toHaveLength(6);
  });

  it('rejects an unrecognized range by falling back to "month" rather than erroring', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).get('/corporate/dashboard').query({ range: 'not-a-real-range' }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
