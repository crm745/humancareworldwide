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

describe('GET /corporate/profile', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/corporate/profile');
    expect(res.status).toBe(401);
  });

  it('returns the company fields with no bank key', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).get('/corporate/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.company).toBeDefined();
    expect(res.body.bank).toBeUndefined();
  });
});

describe('PUT /corporate/profile/company', () => {
  it('updates and persists company fields', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app)
      .put('/corporate/profile/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ contactName: 'Priya Sharma', contactEmail: 'priya@example.com', city: 'Mumbai' });
    expect(res.status).toBe(200);
    expect(res.body.company.contactName).toBe('Priya Sharma');

    const reGet = await request(app).get('/corporate/profile').set('Authorization', `Bearer ${token}`);
    expect(reGet.body.company.city).toBe('Mumbai');
  });
});

describe('GET /corporate/settings', () => {
  it('returns sensible defaults when nothing has been saved yet', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).get('/corporate/settings').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('English');
    expect(res.body.twoFactor).toBe(false);
  });
});

describe('PUT /corporate/settings', () => {
  it('saves and returns updated settings', async () => {
    const { token } = await createCorporateUserAndLogin();
    const newSettings = { notifications: { email: false, sms: true, inApp: true }, language: 'Hindi', timezone: 'Asia/Kolkata', dateFormat: 'DD MMM YYYY', twoFactor: true };
    const res = await request(app).put('/corporate/settings').set('Authorization', `Bearer ${token}`).send(newSettings);
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('Hindi');
    expect(res.body.twoFactor).toBe(true);

    const reGet = await request(app).get('/corporate/settings').set('Authorization', `Bearer ${token}`);
    expect(reGet.body.language).toBe('Hindi');
  });
});

describe('GET /corporate/search', () => {
  it('returns nothing for a too-short query', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).get('/corporate/search').query({ q: 'a' }).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('finds a case by patient name and only within this corporate', async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Search Corporate A' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Search Corporate B' });
    await prisma.case.create({
      data: {
        corporateId: corporateA.corporate.id,
        referenceNumber: `CASE-SEARCH-${Date.now()}`,
        patientName: 'Zubin Mehta Search Target',
        serviceType: 'Air Ambulance',
        origin: 'Delhi',
        destination: 'London',
        status: 'submitted',
      },
    });

    const resA = await request(app).get('/corporate/search').query({ q: 'Zubin Mehta' }).set('Authorization', `Bearer ${corporateA.token}`);
    expect(resA.body.some((r) => r.kind === 'case')).toBe(true);
    expect(resA.body.some((r) => r.kind === 'patient')).toBe(true);

    const resB = await request(app).get('/corporate/search').query({ q: 'Zubin Mehta' }).set('Authorization', `Bearer ${corporateB.token}`);
    expect(resB.body).toEqual([]);
  });
});
