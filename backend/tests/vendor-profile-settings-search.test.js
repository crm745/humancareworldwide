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

describe('GET /vendor/profile', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/vendor/profile');
    expect(res.status).toBe(401);
  });

  it('returns the company fields with no bank key', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).get('/vendor/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.company).toBeDefined();
    expect(res.body.bank).toBeUndefined();
  });
});

describe('PUT /vendor/profile/company', () => {
  it('updates and persists company fields', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app)
      .put('/vendor/profile/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ contactName: 'Priya Sharma', contactEmail: 'priya@example.com', city: 'Mumbai' });
    expect(res.status).toBe(200);
    expect(res.body.company.contactName).toBe('Priya Sharma');

    const reGet = await request(app).get('/vendor/profile').set('Authorization', `Bearer ${token}`);
    expect(reGet.body.company.city).toBe('Mumbai');
  });
});

describe('GET /vendor/settings', () => {
  it('returns sensible defaults when nothing has been saved yet', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).get('/vendor/settings').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('English');
    expect(res.body.twoFactor).toBe(false);
  });
});

describe('PUT /vendor/settings', () => {
  it('saves and returns updated settings', async () => {
    const { token } = await createVendorUserAndLogin();
    const newSettings = { notifications: { email: false, sms: true, inApp: true }, language: 'Hindi', timezone: 'Asia/Kolkata', dateFormat: 'DD MMM YYYY', twoFactor: true };
    const res = await request(app).put('/vendor/settings').set('Authorization', `Bearer ${token}`).send(newSettings);
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('Hindi');
    expect(res.body.twoFactor).toBe(true);

    const reGet = await request(app).get('/vendor/settings').set('Authorization', `Bearer ${token}`);
    expect(reGet.body.language).toBe('Hindi');
  });
});

describe('GET /vendor/search', () => {
  it('returns nothing for a too-short query', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).get('/vendor/search').query({ q: 'a' }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('finds a case by patient name and only within this vendor', async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Search Vendor A' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Search Vendor B' });
    await prisma.case.create({
      data: {
        vendorId: vendorA.vendor.id,
        referenceNumber: `CASE-SEARCH-${Date.now()}`,
        patientName: 'Zubin Mehta Search Target',
        serviceType: 'Air Ambulance',
        origin: 'Delhi',
        destination: 'London',
        status: 'submitted',
      },
    });

    const resA = await request(app).get('/vendor/search').query({ q: 'Zubin Mehta' }).set('Authorization', `Bearer ${vendorA.token}`);
    expect(resA.body.some((r) => r.kind === 'case')).toBe(true);
    expect(resA.body.some((r) => r.kind === 'patient')).toBe(true);

    const resB = await request(app).get('/vendor/search').query({ q: 'Zubin Mehta' }).set('Authorization', `Bearer ${vendorB.token}`);
    expect(resB.body).toEqual([]);
  });
});
