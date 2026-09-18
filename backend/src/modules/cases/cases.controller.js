const {
  listCasesForVendor,
  listUnassignedCases,
  getCaseById,
  assignCaseToVendor,
  createCaseByVendor,
  updateCaseStage,
} = require('./cases.service');
const { addDocumentToCase } = require('../documents/documents.service');

async function listMyCases(req, res, next) {
  try {
    const cases = await listCasesForVendor(req.user.vendorId, { status: req.query.status });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function listUnassigned(req, res, next) {
  try {
    const cases = await listUnassignedCases();
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function getCase(req, res, next) {
  try {
    const caseRecord = await getCaseById(req.params.id);
    if (caseRecord.vendorId && caseRecord.vendorId !== req.user.vendorId) {
      return res.status(403).json({ error: 'This case belongs to a different vendor.' });
    }
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function claimCase(req, res, next) {
  try {
    const caseRecord = await assignCaseToVendor(req.params.id, req.user.vendorId);
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
    const caseRecord = await createCaseByVendor(req.user.vendorId, req.body);
    res.status(201).json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function updateStage(req, res, next) {
  try {
    const { stage, note } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage is required' });
    const caseRecord = await updateCaseStage(req.params.id, stage, note);
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function uploadCaseDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const caseRecord = await getCaseById(req.params.id);
    if (caseRecord.vendorId && caseRecord.vendorId !== req.user.vendorId) {
      return res.status(403).json({ error: 'This case belongs to a different vendor.' });
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

module.exports = { listMyCases, listUnassigned, getCase, claimCase, createCase, updateStage, uploadCaseDocument };
