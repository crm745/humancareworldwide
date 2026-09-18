const { prisma } = require('../../db/prisma');

async function addDocumentToCase(caseId, { name, fileUrl, fileSizeBytes }) {
  return prisma.document.create({
    data: { caseId: Number(caseId), name, fileUrl, fileSizeBytes: fileSizeBytes || null },
  });
}

async function listDocumentsForCase(caseId) {
  return prisma.document.findMany({ where: { caseId: Number(caseId) }, orderBy: { uploadedAt: 'desc' } });
}

module.exports = { addDocumentToCase, listDocumentsForCase };
