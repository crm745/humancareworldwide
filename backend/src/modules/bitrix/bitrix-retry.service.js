// Recovers leads that failed to sync to Bitrix24 on first submission — both the
// patient app's flow (requests.service.js#createRequest) and the corporate-portal's
// (cases.service.js#createCaseByCorporate) persist a failure the same way, so this
// sweeps both instead of just logging to a console nobody watches.
//
// No job queue (BullMQ/Redis) is set up in this project yet, so this runs as a
// plain interval inside the API process instead (see server.js) — good enough at
// this scale, and avoids adding infrastructure nobody asked for.
const { prisma } = require('../../db/prisma');
const { createLead } = require('./bitrix.service');

const MAX_ATTEMPTS = 5;
// ~5 attempts spaced this far apart covers roughly the "30 minutes" window the
// original audit recommended, without hammering Bitrix24 every tick.
const RETRY_BACKOFF_MINUTES = 6;

const PENDING_WHERE = {
  bitrixLeadId: null,
  bitrixSyncAttempts: { gt: 0, lt: MAX_ATTEMPTS },
  bitrixSyncFailedAt: { lt: new Date(Date.now() - RETRY_BACKOFF_MINUTES * 60 * 1000) },
};

// `label` is just for log lines; `model` is the Prisma delegate (prisma.serviceRequest
// or prisma.case) so the same retry/backoff/alert logic isn't duplicated per source.
async function retryModel(model, label, findCandidates, buildLeadInput) {
  const candidates = await findCandidates();
  for (const record of candidates) {
    try {
      const leadId = await createLead(buildLeadInput(record));
      await model.update({
        where: { id: record.id },
        data: { bitrixLeadId: leadId, bitrixLastError: null, bitrixSyncFailedAt: null },
      });
      console.log(`Bitrix24 retry succeeded for ${label} ${record.referenceNumber} (attempt ${record.bitrixSyncAttempts + 1}).`);
    } catch (err) {
      const attempts = record.bitrixSyncAttempts + 1;
      await model.update({
        where: { id: record.id },
        data: { bitrixSyncAttempts: attempts, bitrixLastError: err.message, bitrixSyncFailedAt: new Date() },
      });
      if (attempts >= MAX_ATTEMPTS) {
        // Stand-in for a Slack/email alert — no alerting channel is wired up yet,
        // so this is the one place ops would currently see a permanently-dropped lead.
        console.error(`[ALERT] Bitrix24 lead creation permanently failed for ${label} ${record.referenceNumber} after ${attempts} attempts: ${err.message}`);
      } else {
        console.error(`Bitrix24 retry ${attempts}/${MAX_ATTEMPTS} failed for ${label} ${record.referenceNumber}: ${err.message}`);
      }
    }
  }
  return candidates.length;
}

async function retryFailedBitrixSyncs() {
  const requestsRetried = await retryModel(
    prisma.serviceRequest,
    'request',
    () => prisma.serviceRequest.findMany({ where: PENDING_WHERE, include: { user: true } }),
    (request) => ({
      name: request.patientName,
      mobile: request.patientContact || request.user?.mobile,
      email: request.user?.email,
      serviceType: request.serviceType,
      origin: request.origin,
      destination: request.destination,
      referenceNumber: request.referenceNumber,
    }),
  );

  const casesRetried = await retryModel(
    prisma.case,
    'case',
    () => prisma.case.findMany({ where: PENDING_WHERE }),
    (caseRecord) => ({
      name: caseRecord.patientName,
      mobile: caseRecord.patientContact,
      serviceType: caseRecord.serviceType,
      origin: caseRecord.origin,
      destination: caseRecord.destination,
      referenceNumber: caseRecord.referenceNumber,
    }),
  );

  return requestsRetried + casesRetried;
}

module.exports = { retryFailedBitrixSyncs, MAX_ATTEMPTS, RETRY_BACKOFF_MINUTES };
