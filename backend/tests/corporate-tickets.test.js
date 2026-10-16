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

const baseTicket = { subject: 'Cannot upload document', category: 'Technical', priority: 'High', description: 'Upload button does nothing.' };

describe('POST /corporate/tickets', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/corporate/tickets').send(baseTicket);
    expect(res.status).toBe(401);
  });

  it('rejects a ticket missing required fields', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).post('/corporate/tickets').set('Authorization', `Bearer ${token}`).send({ subject: 'x' });
    expect(res.status).toBe(400);
  });

  it('creates a ticket with an initial message from the description', async () => {
    const { token } = await createCorporateUserAndLogin();
    const res = await request(app).post('/corporate/tickets').set('Authorization', `Bearer ${token}`).send(baseTicket);
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^HCW-TKT-\d+$/);
    expect(res.body.status).toBe('Open');
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].body).toBe(baseTicket.description);
  });
});

describe('GET /corporate/tickets', () => {
  it("only lists this corporate's own tickets", async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Ticket Corporate A' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Ticket Corporate B' });
    await request(app).post('/corporate/tickets').set('Authorization', `Bearer ${corporateA.token}`).send(baseTicket);

    const resA = await request(app).get('/corporate/tickets').set('Authorization', `Bearer ${corporateA.token}`);
    expect(resA.body).toHaveLength(1);

    const resB = await request(app).get('/corporate/tickets').set('Authorization', `Bearer ${corporateB.token}`);
    expect(resB.body).toHaveLength(0);
  });
});

describe('POST /corporate/tickets/:id/messages', () => {
  it('appends a message and reopens a resolved ticket', async () => {
    const { token, corporate } = await createCorporateUserAndLogin();
    const createRes = await request(app).post('/corporate/tickets').set('Authorization', `Bearer ${token}`).send(baseTicket);
    const ticketId = createRes.body.id;

    // Resolve it directly (rather than through the admin API, to keep this test focused
    // on the corporate-side reopen behaviour) then verify replying reopens it.
    const dbId = Number(/(\d+)$/.exec(ticketId)[1]);
    await prisma.supportTicket.update({ where: { id: dbId }, data: { status: 'resolved' } });

    const replyRes = await request(app)
      .post(`/corporate/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Still happening, please reopen.' });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.status).toBe('Open');
    expect(replyRes.body.messages).toHaveLength(2);
  });

  it("404s for another corporate's ticket", async () => {
    const corporateA = await createCorporateUserAndLogin({ companyName: 'Ticket Corporate C' });
    const corporateB = await createCorporateUserAndLogin({ companyName: 'Ticket Corporate D' });
    const createRes = await request(app).post('/corporate/tickets').set('Authorization', `Bearer ${corporateA.token}`).send(baseTicket);

    const res = await request(app)
      .post(`/corporate/tickets/${createRes.body.id}/messages`)
      .set('Authorization', `Bearer ${corporateB.token}`)
      .send({ body: 'Trying to reply to someone else\'s ticket.' });
    expect(res.status).toBe(404);
  });
});
