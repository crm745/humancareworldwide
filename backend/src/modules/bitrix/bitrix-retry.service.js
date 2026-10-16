// Recovers leads that failed to sync to Bitrix24 on first submission (see the
// try/catch in requests.service.js#createRequest). Without this, a dropped lead
// was gone for good — logged to a console nobody watches, never retried.
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

async function retryFailedBitrixSyncs() {
  const candidates = await prisma.serviceRequest.findMany({
    where: {
      bitrixLeadId: null,
      bitrixSyncAttempts: { gt: 0, lt: MAX_ATTEMPTS },
      bitrixSyncFailedAt: { lt: new Date(Date.now() - RETRY_BACKOFF_MINUTES * 60 * 1000) },
    },
    include: { user: true },
  });

  for (const request of candidates) {
    try {
      const leadId = await createLead({
        name: request.patientName,
        mobile: request.patientContact || request.user?.mobile,
        email: request.user?.email,
        serviceType: request.serviceType,
        origin: request.origin,
        destination: request.destination,
        referenceNumber: request.referenceNumber,
      });
      await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { bitrixLeadId: leadId, bitrixLastError: null, bitrixSyncFailedAt: null },
      });
      console.log(`Bitrix24 retry succeeded for ${request.referenceNumber} (attempt ${request.bitrixSyncAttempts + 1}).`);
    } catch (err) {
      const attempts = request.bitrixSyncAttempts + 1;
      await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { bitrixSyncAttempts: attempts, bitrixLastError: err.message, bitrixSyncFailedAt: new Date() },
      });
      if (attempts >= MAX_ATTEMPTS) {
        // Stand-in for a Slack/email alert — no alerting channel is wired up yet,
        // so this is the one place ops would currently see a permanently-dropped lead.
        console.error(`[ALERT] Bitrix24 lead creation permanently failed for ${request.referenceNumber} after ${attempts} attempts: ${err.message}`);
      } else {
        console.error(`Bitrix24 retry ${attempts}/${MAX_ATTEMPTS} failed for ${request.referenceNumber}: ${err.message}`);
      }
    }
  }
  return candidates.length;
}

module.exports = { retryFailedBitrixSyncs, MAX_ATTEMPTS, RETRY_BACKOFF_MINUTES };
