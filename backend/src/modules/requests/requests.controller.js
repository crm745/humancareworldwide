const {
  createRequest,
  listRequestsForUser,
  getRequestForUser,
  listDocumentsForUser,
} = require('./requests.service');
const { addDocumentToCase } = require('../documents/documents.service');
const { sendMedicalReportToBitrix } = require('../bitrix/bitrix.service');
const { streamRequestSummaryPdf } = require('./request-summary.pdf');

const REQUIRED_FIELDS = ['serviceType', 'patientName', 'origin', 'destination'];
const { REQUIRED_SERVICE_BY_KEY } = require('../bitrix/bitrix-lead');
// Service keys the app may send (see mobile src/data/mock.js SERVICE_TILES). Optional,
// since older app builds don't send one; "hospital" has no Bitrix service mapped yet.
const SERVICE_KEYS = new Set([...Object.keys(REQUIRED_SERVICE_BY_KEY), 'hospital', 'air']);
// Mortal Remains as the app asks it now ("Within India / International"); older builds
// sent plain "mortal" with the ordinary patient form.
const MORTAL_KEYS = ['mortal_domestic', 'mortal_international'];
const MORTAL_FIELDS = ['deceasedRelation', 'placeOfDeath', 'dateOfDeath'];

// The deceased's details: all three given, and a date of death that isn't in the future.
function mortalFieldsError(body) {
  if (!MORTAL_KEYS.includes(body.serviceKey)) return null;
  const missing = MORTAL_FIELDS.filter((field) => !body[field]);
  if (missing.length) return `Missing required field(s): ${missing.join(', ')}`;
  // A day's slack: "today" in the family's time zone (up to UTC+14) can be tomorrow in UTC.
  const date = new Date(body.dateOfDeath);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return 'Invalid dateOfDeath';
  return null;
}

//the function for submitting the request
async function submitRequest(req, res, next) {
  try {
    const missing = REQUIRED_FIELDS.filter((field) => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }
    if (req.body.serviceKey !== undefined && !SERVICE_KEYS.has(req.body.serviceKey)) {
      return res.status(400).json({ error: 'Unknown serviceKey' });
    }
    const mortalError = mortalFieldsError(req.body);
    if (mortalError) return res.status(400).json({ error: mortalError });
    const request = await createRequest(req.user.id, req.body);
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}
// tell me what features and functionalities are there in the admin portal and super admin..and are they in the same webapp or what..explain me how to access them differently
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
//
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
    // This is the request form's one upload: "Upload Medical Report", or for Mortal
    // Remains "Upload Death Certificate". The lead has no death-certificate field, so
    // that one stays with us (Bitrix has it on the deal; sent once deals are synced).
    const mortal = MORTAL_KEYS.includes(request.serviceKey);
    const document = await addDocumentToCase(request.case.id, {
      type: mortal ? 'Death Certificate' : 'Medical Report',
      name: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSizeBytes: req.file.size,
    });
    if (!mortal) await sendMedicalReportToBitrix(request.bitrixLeadId, document);
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
