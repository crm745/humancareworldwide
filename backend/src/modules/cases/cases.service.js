const { prisma } = require('../../db/prisma');

const VALID_CASE_STATUSES = ['submitted', 'scheduled', 'in_progress', 'completed', 'cancelled'];
const CASE_INCLUDE = {
  stageEvents: { orderBy: { occurredAt: 'asc' } },
  documents: true,
  serviceRequest: { select: { id: true, userId: true, referenceNumber: true } },
};

async function listCasesForVendor(vendorId, { status } = {}) {
  const where = { vendorId };
  if (status && status !== 'all') {
    if (!VALID_CASE_STATUSES.includes(status)) {
      const err = new Error(`Invalid status filter. Use one of: ${VALID_CASE_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    where.status = status;
  }
  return prisma.case.findMany({ where, orderBy: { updatedAt: 'desc' } });
}

// Cases land unassigned (vendorId null) when a patient submits a request. Any vendor
// user can see the unassigned queue and claim one into their own company's list.
async function listUnassignedCases() {
  return prisma.case.findMany({ where: { vendorId: null }, orderBy: { createdAt: 'asc' } });
}

async function getCaseById(id) {
  const caseRecord = await prisma.case.findUnique({ where: { id: Number(id) }, include: CASE_INCLUDE });
  if (!caseRecord) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }
  return caseRecord;
}

async function assignCaseToVendor(caseId, vendorId) {
  const caseRecord = await getCaseById(caseId);
  if (caseRecord.vendorId) {
    const err = new Error('Case is already assigned to a vendor.');
    err.statusCode = 409;
    throw err;
  }
  return prisma.case.update({ where: { id: caseRecord.id }, data: { vendorId } });
}

async function createCaseByVendor(vendorId, data) {
  const { patientName, patientContact, serviceType, origin, destination, urgency, policyReference, notes } = data;

  const created = await prisma.case.create({
    data: {
      vendorId,
      referenceNumber: `TEMP-${Date.now()}`,
      patientName,
      patientContact: patientContact || null,
      serviceType,
      origin,
      destination,
      urgency: urgency || 'routine',
      policyReference: policyReference || null,
      notes: notes || null,
      status: 'submitted',
    },
  });

  const caseRecord = await prisma.case.update({
    where: { id: created.id },
    data: { referenceNumber: `REQ-${1000 + created.id}` },
  });

  await prisma.caseStageEvent.create({
    data: { caseId: caseRecord.id, stage: 'submitted', note: 'Case opened by vendor.' },
  });

  return caseRecord;
}

async function updateCaseStage(caseId, stage, note) {
  if (!VALID_CASE_STATUSES.includes(stage)) {
    const err = new Error(`Invalid stage. Use one of: ${VALID_CASE_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const caseRecord = await getCaseById(caseId);

  const updated = await prisma.case.update({ where: { id: caseRecord.id }, data: { status: stage } });
  await prisma.caseStageEvent.create({ data: { caseId: caseRecord.id, stage, note: note || null } });

  if (caseRecord.serviceRequest) {
    // Keep the patient-facing ServiceRequest.status in the same simplified vocabulary
    // the My Requests screen filters on.
    const requestStatus = stage === 'completed' ? 'completed' : stage === 'cancelled' ? 'cancelled' : stage === 'submitted' ? 'submitted' : 'in_progress';
    await prisma.serviceRequest.update({ where: { id: caseRecord.serviceRequest.id }, data: { status: requestStatus } });
    await notifyPatient(caseRecord.serviceRequest.userId, {
      kind: 'stage_update',
      title: `${caseRecord.referenceNumber} update`,
      body: note || `Your case moved to "${stage.replace('_', ' ')}".`,
    });
  }

  return updated;
}

async function notifyPatient(userId, { kind, title, body }) {
  return prisma.notification.create({
    data: { recipientType: 'patient', recipientId: userId, kind, title, body },
  });
}

module.exports = {
  VALID_CASE_STATUSES,
  listCasesForVendor,
  listUnassignedCases,
  getCaseById,
  assignCaseToVendor,
  createCaseByVendor,
  updateCaseStage,
};
