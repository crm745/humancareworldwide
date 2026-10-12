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

describe('GET /vendor/dashboard', () => {
  it('requires vendor authentication', async () => {
    const res = await request(app).get('/vendor/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns zeroed stats for a vendor with no cases', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).get('/vendor/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.totalCases).toBe(0);
    expect(res.body.statusBreakdown).toHaveLength(5);
    expect(res.body.monthly).toHaveLength(12);
    expect(res.body.recentCases).toEqual([]);
  });

  it('counts only this vendor\'s cases, not another vendor\'s', async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Dashboard Vendor A' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Dashboard Vendor B' });

    await createCaseDirect(vendorA.vendor.id, { status: 'completed' });
    await createCaseDirect(vendorA.vendor.id, { status: 'submitted' });
    await createCaseDirect(vendorB.vendor.id, { status: 'completed' });

    const resA = await request(app).get('/vendor/dashboard').set('Authorization', `Bearer ${vendorA.token}`);
    expect(resA.body.stats.totalCases).toBe(2);
    expect(resA.body.stats.completedCases).toBe(1);
    expect(resA.body.stats.pendingCases).toBe(1);

    const resB = await request(app).get('/vendor/dashboard').set('Authorization', `Bearer ${vendorB.token}`);
    expect(resB.body.stats.totalCases).toBe(1);
  });

  it('lists recent cases newest-first, capped at 6', async () => {
    const { token, vendor } = await createVendorUserAndLogin();
    for (let i = 0; i < 8; i++) {
      await createCaseDirect(vendor.id);
    }
    const res = await request(app).get('/vendor/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.body.recentCases).toHaveLength(6);
  });

  it('rejects an unrecognized range by falling back to "month" rather than erroring', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).get('/vendor/dashboard').query({ range: 'not-a-real-range' }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
