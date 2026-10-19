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

function uniqueSlug() {
  return `test-service-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

describe('GET /services (public)', () => {
  it('lists services without requiring authentication', async () => {
    const res = await request(app).get('/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
  });

  it('404s for an unknown slug', async () => {
    const res = await request(app).get('/services/does-not-exist-xyz');
    expect(res.status).toBe(404);
  });
});

describe('admin service management', () => {
  it('requires admin authentication to create a service', async () => {
    const res = await request(app).post('/admin/services').send({ slug: uniqueSlug(), name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('creates, updates, and deletes a service', async () => {
    const { token } = await createAdminAndLogin({ role: 'superadmin' });
    const slug = uniqueSlug();

    const createRes = await request(app)
      .post('/admin/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug, name: 'Test Service' });
    expect(createRes.status).toBe(201);

    const publicRes = await request(app).get(`/services/${slug}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.service.name).toBe('Test Service');

    const updateRes = await request(app)
      .patch(`/admin/services/${slug}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Service' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.service.name).toBe('Renamed Service');

    const deleteRes = await request(app).delete(`/admin/services/${slug}`).set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const afterDelete = await request(app).get(`/services/${slug}`);
    expect(afterDelete.status).toBe(404);
  });
});
