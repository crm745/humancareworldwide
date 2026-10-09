const { prisma } = require('../../db/prisma');

async function addDocumentToCase(caseId, { name, fileUrl, fileSizeBytes }) {
  return prisma.document.create({
    data: { caseId: Number(caseId), name, fileUrl, fileSizeBytes: fileSizeBytes || null },
  });
}

async function listDocumentsForCase(caseId) {
  return prisma.document.findMany({ where: { caseId: Number(caseId) }, orderBy: { uploadedAt: 'desc' } });
}

// A patient may only read their own documents; a vendor only the ones on cases they
// submitted. Throws (rather than returning null) so the controller can 404 either way
// without leaking whether the document exists to someone who shouldn't see it.
async function getDocumentForUser(documentId, user) {
  const document = await prisma.document.findUnique({
    where: { id: Number(documentId) },
    include: { case: { select: { vendorId: true, serviceRequest: { select: { userId: true } } } } },
  });

  const owned = document && (
    (user.role === 'patient' && document.case.serviceRequest?.userId === user.id) ||
    (user.role === 'vendor' && document.case.vendorId === user.vendorId)
  );
  if (!owned) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }
  return document;
}

module.exports = { addDocumentToCase, listDocumentsForCase, getDocumentForUser };
