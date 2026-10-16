const {
  listCasesForCorporate,
  getCaseById,
  createCaseByCorporate,
} = require('./cases.service');
const { addDocumentToCase } = require('../documents/documents.service');

async function listMyCases(req, res, next) {
  try {
    const cases = await listCasesForCorporate(req.user.corporateId, { status: req.query.status });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function getCase(req, res, next) {
  try {
    const caseRecord = await getCaseById(req.params.id);
    if (caseRecord.corporateId !== req.user.corporateId) {
      return res.status(403).json({ error: 'This case was not submitted by your organization.' });
    }
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function createCase(req, res, next) {
  try {
    const { patientName, serviceType, origin, destination } = req.body;
    if (!patientName || !serviceType || !origin || !destination) {
      return res.status(400).json({ error: 'patientName, serviceType, origin and destination are required' });
    }
    const caseRecord = await createCaseByCorporate(req.user.corporateId, req.body);
    res.status(201).json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function uploadCaseDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const caseRecord = await getCaseById(req.params.id);
    if (caseRecord.corporateId !== req.user.corporateId) {
      return res.status(403).json({ error: 'This case was not submitted by your organization.' });
    }
    const document = await addDocumentToCase(caseRecord.id, {
      name: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSizeBytes: req.file.size,
    });
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyCases, getCase, createCase, uploadCaseDocument };
