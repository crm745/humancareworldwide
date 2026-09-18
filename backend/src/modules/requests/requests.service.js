const { prisma } = require('../../db/prisma');

const VALID_STATUSES = ['submitted', 'in_progress', 'completed', 'cancelled'];

async function createRequest(userId, data) {
  const {
    serviceType,
    patientName,
    patientAge,
    patientGender,
    patientLocation,
    patientContact,
    origin,
    destination,
    preferredDate,
    careLevel,
    description,
    medicalSummary,
    specialRequirements,
    referralSource,
    documentUrl,
  } = data;

  // Create first so we have an id, then stamp a human-friendly reference number onto it.
  const created = await prisma.serviceRequest.create({
    data: {
      userId,
      serviceType,
      patientName,
      patientAge: patientAge != null ? Number(patientAge) : null,
      patientGender: patientGender || null,
      patientLocation: patientLocation || null,
      patientContact: patientContact || null,
      origin,
      destination,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      careLevel: careLevel || null,
      description: description || null,
      medicalSummary: medicalSummary || null,
      specialRequirements: specialRequirements || null,
      referralSource: referralSource || null,
      documentUrl: documentUrl || null,
      referenceNumber: `TEMP-${Date.now()}`,
      status: 'submitted',
    },
  });

  const referenceNumber = `REQ-${1000 + created.id}`;
  const request = await prisma.serviceRequest.update({
    where: { id: created.id },
    data: { referenceNumber },
  });

  // Every submitted request becomes a Case immediately, unassigned, so it shows up
  // in the vendor queue as soon as it lands — vendors triage from there.
  const newCase = await prisma.case.create({
    data: {
      serviceRequestId: request.id,
      referenceNumber,
      patientName: request.patientName,
      patientContact: request.patientContact,
      serviceType: request.serviceType,
      origin: request.origin,
      destination: request.destination,
      status: 'submitted',
    },
  });
  await prisma.caseStageEvent.create({
    data: { caseId: newCase.id, stage: 'submitted', note: 'Request received from patient app.' },
  });

  return request;
}

async function listRequestsForUser(userId, { status } = {}) {
  const where = { userId };
  if (status && status !== 'all') {
    if (!VALID_STATUSES.includes(status)) {
      const err = new Error(`Invalid status filter. Use one of: ${VALID_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    where.status = status;
  }
  return prisma.serviceRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
}

async function getRequestForUser(userId, id) {
  const request = await prisma.serviceRequest.findFirst({
    where: { id: Number(id), userId },
    include: { case: { include: { stageEvents: { orderBy: { occurredAt: 'asc' } }, documents: true } } },
  });
  if (!request) {
    const err = new Error('Request not found');
    err.statusCode = 404;
    throw err;
  }
  return request;
}

async function getRequestByReferenceForGuest(referenceNumber, mobile) {
  const request = await prisma.serviceRequest.findUnique({
    where: { referenceNumber },
    include: {
      user: true,
      case: { include: { stageEvents: { orderBy: { occurredAt: 'asc' } }, documents: true } },
    },
  });
  if (!request || request.user.mobile !== mobile) {
    const err = new Error('No request found for that reference number and mobile number.');
    err.statusCode = 404;
    throw err;
  }
  const { user, ...requestOnly } = request;
  return requestOnly;
}

module.exports = {
  VALID_STATUSES,
  createRequest,
  listRequestsForUser,
  getRequestForUser,
  getRequestByReferenceForGuest,
};
