jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createPatient } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

async function createNotificationFor(userId, overrides = {}) {
  return prisma.notification.create({
    data: { recipientType: 'patient', recipientId: userId, kind: 'system', title: 'Test notice', ...overrides },
  });
}

describe('GET /notifications', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });

  it("only returns the logged-in patient's own notifications", async () => {
    const owner = await createPatient();
    const stranger = await createPatient();
    await createNotificationFor(owner.user.id);

    const ownRes = await request(app).get('/notifications').set('Authorization', `Bearer ${owner.token}`);
    expect(ownRes.body.notifications.length).toBeGreaterThanOrEqual(1);

    const strangerRes = await request(app).get('/notifications').set('Authorization', `Bearer ${stranger.token}`);
    expect(strangerRes.body.notifications.length).toBe(0);
  });

  it('unreadOnly=true filters out already-read notifications', async () => {
    const owner = await createPatient();
    await createNotificationFor(owner.user.id, { readAt: new Date() });
    await createNotificationFor(owner.user.id);

    const res = await request(app)
      .get('/notifications')
      .query({ unreadOnly: 'true' })
      .set('Authorization', `Bearer ${owner.token}`);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].readAt).toBeFalsy();
  });
});

describe('marking notifications read', () => {
  it('marks a single notification read', async () => {
    const owner = await createPatient();
    const notif = await createNotificationFor(owner.user.id);

    const res = await request(app)
      .post(`/notifications/${notif.id}/read`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.notification.readAt).toBeTruthy();
  });

  it('marks all of a patient\'s notifications read', async () => {
    const owner = await createPatient();
    await createNotificationFor(owner.user.id);
    await createNotificationFor(owner.user.id);

    const markRes = await request(app).post('/notifications/read-all').set('Authorization', `Bearer ${owner.token}`);
    expect(markRes.status).toBe(200);

    const listRes = await request(app)
      .get('/notifications')
      .query({ unreadOnly: 'true' })
      .set('Authorization', `Bearer ${owner.token}`);
    expect(listRes.body.notifications.length).toBe(0);
  });
});
