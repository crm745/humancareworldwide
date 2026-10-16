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

async function createNotifFor(corporateUserId, overrides = {}) {
  return prisma.notification.create({
    data: { recipientType: 'corporate_user', recipientId: corporateUserId, kind: 'stage_update', title: 'Case update', body: 'Your case moved forward.', ...overrides },
  });
}

describe('GET /corporate/notifications', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/corporate/notifications');
    expect(res.status).toBe(401);
  });

  it("reshapes fields for the portal and only returns this corporate user's own", async () => {
    const owner = await createCorporateUserAndLogin();
    const stranger = await createCorporateUserAndLogin();
    await createNotifFor(owner.corporateUser.id);

    const res = await request(app).get('/corporate/notifications').set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ title: 'Case update', message: 'Your case moved forward.', type: 'case', read: false });

    const strangerRes = await request(app).get('/corporate/notifications').set('Authorization', `Bearer ${stranger.token}`);
    expect(strangerRes.body).toHaveLength(0);
  });
});

describe('PATCH /corporate/notifications/:id', () => {
  it('marks a notification read, and can toggle it back to unread', async () => {
    const { token, corporateUser } = await createCorporateUserAndLogin();
    const notif = await createNotifFor(corporateUser.id);

    const readRes = await request(app)
      .patch(`/corporate/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true });
    expect(readRes.body.read).toBe(true);

    const unreadRes = await request(app)
      .patch(`/corporate/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: false });
    expect(unreadRes.body.read).toBe(false);
  });

  it("404s for a notification that isn't this corporate user's own", async () => {
    const owner = await createCorporateUserAndLogin();
    const stranger = await createCorporateUserAndLogin();
    const notif = await createNotifFor(owner.corporateUser.id);

    const res = await request(app)
      .patch(`/corporate/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ read: true });
    expect(res.status).toBe(404);
  });
});

describe('POST /corporate/notifications/read-all', () => {
  it('marks every unread notification read for this corporate user', async () => {
    const { token, corporateUser } = await createCorporateUserAndLogin();
    await createNotifFor(corporateUser.id);
    await createNotifFor(corporateUser.id);

    const markRes = await request(app).post('/corporate/notifications/read-all').set('Authorization', `Bearer ${token}`);
    expect(markRes.status).toBe(200);

    const listRes = await request(app).get('/corporate/notifications').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.every((n) => n.read)).toBe(true);
  });
});

describe('DELETE /corporate/notifications/:id', () => {
  it('deletes a notification', async () => {
    const { token, corporateUser } = await createCorporateUserAndLogin();
    const notif = await createNotifFor(corporateUser.id);

    const delRes = await request(app).delete(`/corporate/notifications/${notif.id}`).set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);

    const listRes = await request(app).get('/corporate/notifications').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toHaveLength(0);
  });
});
