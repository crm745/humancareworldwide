// Covers the authenticated/ownership-checked document download added 2026-10-07 —
// the whole point of that fix was that documents must NOT be reachable by anyone
// other than the patient (or corporate) who owns them.
jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/modules/bitrix/bitrix.service', () => ({
  createLead: jest.fn().mockResolvedValue(12345),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createPatient } = require('./helpers');

afterAll(async () => {
  await prisma.$disconnect();
});

async function submitRequestWithDocument(token) {
  const createRes = await request(app)
    .post('/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ serviceType: 'Air Ambulance', patientName: 'Doc Owner', origin: 'Mumbai', destination: 'Dubai' });
  const requestId = createRes.body.request.id;

  const uploadRes = await request(app)
    .post(`/requests/me/${requestId}/documents`)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'medical-report.pdf', contentType: 'application/pdf' });

  return uploadRes.body.document;
}

describe('GET /documents/:id/file', () => {
  it('requires authentication', async () => {
    const owner = await createPatient();
    const doc = await submitRequestWithDocument(owner.token);
    const res = await request(app).get(`/documents/${doc.id}/file`);
    expect(res.status).toBe(401);
  });

  it("lets the owning patient download their own document", async () => {
    const owner = await createPatient();
    const doc = await submitRequestWithDocument(owner.token);
    const res = await request(app).get(`/documents/${doc.id}/file`).set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
  });

  it("refuses to let a different patient download someone else's document", async () => {
    const owner = await createPatient();
    const doc = await submitRequestWithDocument(owner.token);
    const stranger = await createPatient();

    const res = await request(app).get(`/documents/${doc.id}/file`).set('Authorization', `Bearer ${stranger.token}`);
    expect(res.status).toBe(404);
  });
});
