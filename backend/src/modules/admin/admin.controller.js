const {
  loginAdmin,
  listVendors,
  createVendor,
  createVendorUser,
  listAllCases,
  reassignCase,
  searchPatients,
} = require('./admin.service');
const { updateCaseStage, getCaseById, VALID_CASE_STATUSES } = require('../cases/cases.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await loginAdmin(email, password);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getVendors(req, res, next) {
  try {
    const vendors = await listVendors();
    res.json({ vendors });
  } catch (err) {
    next(err);
  }
}

async function postVendor(req, res, next) {
  try {
    const { companyName, type } = req.body;
    if (!companyName || !type) return res.status(400).json({ error: 'companyName and type are required' });
    const vendor = await createVendor({ companyName, type });
    res.status(201).json({ vendor });
  } catch (err) {
    next(err);
  }
}

async function postVendorUser(req, res, next) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const vendorUser = await createVendorUser(req.params.id, { email, password, role });
    res.status(201).json({ vendorUser });
  } catch (err) {
    next(err);
  }
}

async function getCases(req, res, next) {
  try {
    const cases = await listAllCases({ status: req.query.status, vendorId: req.query.vendorId });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

// Unlike the vendor-facing getCase, admin can view any case regardless of which
// vendor it belongs to — no ownership check.
async function getCase(req, res, next) {
  try {
    const caseRecord = await getCaseById(req.params.id);
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function patchCaseAssign(req, res, next) {
  try {
    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ error: 'vendorId is required' });
    const caseRecord = await reassignCase(req.params.id, vendorId);
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function getPatients(req, res, next) {
  try {
    const patients = await searchPatients(req.query.search);
    res.json({ patients: patients.map(({ passwordHash, ...rest }) => rest) });
  } catch (err) {
    next(err);
  }
}

// Manual stand-in for the Bitrix24 stage-change webhook until that's wired up —
// lets admin/ops move a case's stage from here in the meantime. See cases.service.js.
async function patchCaseStage(req, res, next) {
  try {
    const { stage, note } = req.body;
    if (!stage) return res.status(400).json({ error: `stage is required. Use one of: ${VALID_CASE_STATUSES.join(', ')}` });
    const caseRecord = await updateCaseStage(req.params.id, stage, note);
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getVendors, postVendor, postVendorUser, getCases, getCase, patchCaseAssign, getPatients, patchCaseStage };
