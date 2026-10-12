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

async function createNotifFor(vendorUserId, overrides = {}) {
  return prisma.notification.create({
    data: { recipientType: 'vendor_user', recipientId: vendorUserId, kind: 'stage_update', title: 'Case update', body: 'Your case moved forward.', ...overrides },
  });
}

describe('GET /vendor/notifications', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/vendor/notifications');
    expect(res.status).toBe(401);
  });

  it("reshapes fields for the portal and only returns this vendor user's own", async () => {
    const owner = await createVendorUserAndLogin();
    const stranger = await createVendorUserAndLogin();
    await createNotifFor(owner.vendorUser.id);

    const res = await request(app).get('/vendor/notifications').set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ title: 'Case update', message: 'Your case moved forward.', type: 'case', read: false });

    const strangerRes = await request(app).get('/vendor/notifications').set('Authorization', `Bearer ${stranger.token}`);
    expect(strangerRes.body).toHaveLength(0);
  });
});

describe('PATCH /vendor/notifications/:id', () => {
  it('marks a notification read, and can toggle it back to unread', async () => {
    const { token, vendorUser } = await createVendorUserAndLogin();
    const notif = await createNotifFor(vendorUser.id);

    const readRes = await request(app)
      .patch(`/vendor/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true });
    expect(readRes.body.read).toBe(true);

    const unreadRes = await request(app)
      .patch(`/vendor/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: false });
    expect(unreadRes.body.read).toBe(false);
  });

  it("404s for a notification that isn't this vendor user's own", async () => {
    const owner = await createVendorUserAndLogin();
    const stranger = await createVendorUserAndLogin();
    const notif = await createNotifFor(owner.vendorUser.id);

    const res = await request(app)
      .patch(`/vendor/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ read: true });
    expect(res.status).toBe(404);
  });
});

describe('POST /vendor/notifications/read-all', () => {
  it('marks every unread notification read for this vendor user', async () => {
    const { token, vendorUser } = await createVendorUserAndLogin();
    await createNotifFor(vendorUser.id);
    await createNotifFor(vendorUser.id);

    const markRes = await request(app).post('/vendor/notifications/read-all').set('Authorization', `Bearer ${token}`);
    expect(markRes.status).toBe(200);

    const listRes = await request(app).get('/vendor/notifications').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.every((n) => n.read)).toBe(true);
  });
});

describe('DELETE /vendor/notifications/:id', () => {
  it('deletes a notification', async () => {
    const { token, vendorUser } = await createVendorUserAndLogin();
    const notif = await createNotifFor(vendorUser.id);

    const delRes = await request(app).delete(`/vendor/notifications/${notif.id}`).set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);

    const listRes = await request(app).get('/vendor/notifications').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toHaveLength(0);
  });
});
