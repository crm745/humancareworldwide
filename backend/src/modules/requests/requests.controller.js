const {
  createRequest,
  listRequestsForUser,
  getRequestForUser,
  listDocumentsForUser,
} = require('./requests.service');
const { addDocumentToCase } = require('../documents/documents.service');
const { streamRequestSummaryPdf } = require('./request-summary.pdf');

const REQUIRED_FIELDS = ['serviceType', 'patientName', 'origin', 'destination'];
//the function for submit request
async function submitRequest(req, res, next) {
  try {
    const missing = REQUIRED_FIELDS.filter((field) => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }
    const request = await createRequest(req.user.id, req.body);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}
//the function for listing my request..aana
async function listMyRequests(req, res, next) {
  try {
    const requests = await listRequestsForUser(req.user.id, { status: req.query.status });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}
//5 stages of case in app 
// submitted — 
// scheduled — 
// in_progress — 
// completed — 
// cancelled — 

async function getMyRequestById(req, res, next) {
  try {
    const request = await getRequestForUser(req.user.id, req.params.id);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}
//the function for listing documents it is an middleware returning document in json
async function listMyDocuments(req, res, next) {
  try {
    const documents = await listDocumentsForUser(req.user.id);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}
//
async function uploadRequestDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const request = await getRequestForUser(req.user.id, req.params.id);
    if (!request.case) return res.status(409).json({ error: 'This request has no case yet.' });
    // Always a medical report in this flow — this is specifically the "Upload Medical
    // Report" field on the initial request form, in both the mobile app and corporate-portal.
    const document = await addDocumentToCase(request.case.id, {
      type: 'Medical Report',
      name: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSizeBytes: req.file.size,
    });
    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}
//
async function downloadRequestSummary(req, res, next) {
  try {
    const request = await getRequestForUser(req.user.id, req.params.id);
    streamRequestSummaryPdf(res, request);
  } catch (err) {
    next(err);
  }
}
//
module.exports = {
  submitRequest,
  listMyRequests,
  getMyRequestById,
  listMyDocuments,
  uploadRequestDocument,
  downloadRequestSummary,
};
