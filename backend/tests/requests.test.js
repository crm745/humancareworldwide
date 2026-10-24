jest.mock('../src/modules/auth/otp-delivery.service', () => ({
  deliverOtp: jest.fn().mockResolvedValue(undefined),
}));
// A real Bitrix call is an external network dependency tests shouldn't rely on —
// requests.service.js already treats it as best-effort (wrapped in try/catch), so
// mocking it out just keeps tests fast and offline, not changing what's under test.
jest.mock('../src/modules/bitrix/bitrix.service', () => ({
  createLead: jest.fn().mockResolvedValue(12345),
}));

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/db/prisma');
const { createPatient } = require('./helpers');
const { createLead } = require('../src/modules/bitrix/bitrix.service');
const { retryFailedBitrixSyncs } = require('../src/modules/bitrix/bitrix-retry.service');

afterAll(async () => {
  await prisma.$disconnect();
});

const baseRequestBody = {
  serviceType: 'Air Ambulance',
  patientName: 'John Doe',
  origin: 'Mumbai, India',
  destination: 'Dubai, UAE',
};

describe('POST /requests', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/requests').send(baseRequestBody);
    expect(res.status).toBe(401);
  });

  it('rejects a request missing required fields', async () => {
    const { token } = await createPatient();
    const res = await request(app)
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceType: 'Air Ambulance' });
    expect(res.status).toBe(400);
  });

  it('creates a request with a reference number, auto-creating its Case', async () => {
    const { token } = await createPatient();
    const res = await request(app)
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send(baseRequestBody);
    expect(res.status).toBe(201);
    expect(res.body.request.referenceNumber).toMatch(/^REQ-/);
    expect(res.body.request.status).toBe('submitted');
  });
});

describe('Bitrix24 on/off switch', () => {
  afterEach(() => { delete process.env.BITRIX_SYNC_ENABLED; });

  it('sends nothing and records no failure while the switch is off', async () => {
    createLead.mockClear();
    const { token } = await createPatient();
    const res = await request(app).post('/requests').set('Authorization', `Bearer ${token}`).send(baseRequestBody);
    expect(res.status).toBe(201);
    expect(createLead).not.toHaveBeenCalled();
    const saved = await prisma.serviceRequest.findUnique({ where: { id: res.body.request.id } });
    expect(saved.bitrixLeadId).toBeNull();
    expect(saved.bitrixSyncAttempts).toBe(0);
    await expect(retryFailedBitrixSyncs()).resolves.toBe(0);
    expect(createLead).not.toHaveBeenCalled();
  });

  it('sends new requests once switched on, but never the ones made while it was off', async () => {
    createLead.mockClear();
    const { token } = await createPatient();
    const whileOff = await request(app).post('/requests').set('Authorization', `Bearer ${token}`).send(baseRequestBody);

    process.env.BITRIX_SYNC_ENABLED = 'true';
    const whileOn = await request(app).post('/requests').set('Authorization', `Bearer ${token}`).send(baseRequestBody);
    expect(createLead).toHaveBeenCalledTimes(1);
    expect(createLead.mock.calls[0][0].referenceNumber).toBe(whileOn.body.request.referenceNumber);

    await retryFailedBitrixSyncs();
    const off = await prisma.serviceRequest.findUnique({ where: { id: whileOff.body.request.id } });
    expect(off.bitrixLeadId).toBeNull();
    expect(createLead).toHaveBeenCalledTimes(1);
  });
});

describe('request lifecycle for the patient who submitted it', () => {
  it('lists, fetches, and downloads the summary for an own request', async () => {
    const { token } = await createPatient();
    const createRes = await request(app)
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send(baseRequestBody);
    const requestId = createRes.body.request.id;

    const listRes = await request(app).get('/requests/me').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.requests.some((r) => r.id === requestId)).toBe(true);

    const detailRes = await request(app).get(`/requests/me/${requestId}`).set('Authorization', `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.request.id).toBe(requestId);

    const summaryRes = await request(app)
      .get(`/requests/me/${requestId}/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.headers['content-type']).toMatch(/pdf/);
  });

  it('accepts a document upload for its own (auto-created) case', async () => {
    const { token } = await createPatient();
    const createRes = await request(app)
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send(baseRequestBody);
    const requestId = createRes.body.request.id;

    const uploadRes = await request(app)
      .post(`/requests/me/${requestId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4 fake pdf content'), { filename: 'report.pdf', contentType: 'application/pdf' });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.document.name).toBe('report.pdf');
  });

  it("rejects an unsupported file type", async () => {
    const { token } = await createPatient();
    const createRes = await request(app)
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send(baseRequestBody);
    const requestId = createRes.body.request.id;

    const uploadRes = await request(app)
      .post(`/requests/me/${requestId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('bad'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
    expect(uploadRes.status).toBe(400);
  });
});
