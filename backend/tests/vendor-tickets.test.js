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

const baseTicket = { subject: 'Cannot upload document', category: 'Technical', priority: 'High', description: 'Upload button does nothing.' };

describe('POST /vendor/tickets', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/vendor/tickets').send(baseTicket);
    expect(res.status).toBe(401);
  });

  it('rejects a ticket missing required fields', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).post('/vendor/tickets').set('Authorization', `Bearer ${token}`).send({ subject: 'x' });
    expect(res.status).toBe(400);
  });

  it('creates a ticket with an initial message from the description', async () => {
    const { token } = await createVendorUserAndLogin();
    const res = await request(app).post('/vendor/tickets').set('Authorization', `Bearer ${token}`).send(baseTicket);
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^HCW-TKT-\d+$/);
    expect(res.body.status).toBe('Open');
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].body).toBe(baseTicket.description);
  });
});

describe('GET /vendor/tickets', () => {
  it("only lists this vendor's own tickets", async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Ticket Vendor A' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Ticket Vendor B' });
    await request(app).post('/vendor/tickets').set('Authorization', `Bearer ${vendorA.token}`).send(baseTicket);

    const resA = await request(app).get('/vendor/tickets').set('Authorization', `Bearer ${vendorA.token}`);
    expect(resA.body).toHaveLength(1);

    const resB = await request(app).get('/vendor/tickets').set('Authorization', `Bearer ${vendorB.token}`);
    expect(resB.body).toHaveLength(0);
  });
});

describe('POST /vendor/tickets/:id/messages', () => {
  it('appends a message and reopens a resolved ticket', async () => {
    const { token, vendor } = await createVendorUserAndLogin();
    const createRes = await request(app).post('/vendor/tickets').set('Authorization', `Bearer ${token}`).send(baseTicket);
    const ticketId = createRes.body.id;

    // Manually resolve it (no admin-side endpoint exists yet) to test the reopen behaviour.
    const dbId = Number(/(\d+)$/.exec(ticketId)[1]);
    await prisma.supportTicket.update({ where: { id: dbId }, data: { status: 'resolved' } });

    const replyRes = await request(app)
      .post(`/vendor/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Still happening, please reopen.' });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.status).toBe('Open');
    expect(replyRes.body.messages).toHaveLength(2);
  });

  it("404s for another vendor's ticket", async () => {
    const vendorA = await createVendorUserAndLogin({ companyName: 'Ticket Vendor C' });
    const vendorB = await createVendorUserAndLogin({ companyName: 'Ticket Vendor D' });
    const createRes = await request(app).post('/vendor/tickets').set('Authorization', `Bearer ${vendorA.token}`).send(baseTicket);

    const res = await request(app)
      .post(`/vendor/tickets/${createRes.body.id}/messages`)
      .set('Authorization', `Bearer ${vendorB.token}`)
      .send({ body: 'Trying to reply to someone else\'s ticket.' });
    expect(res.status).toBe(404);
  });
});
