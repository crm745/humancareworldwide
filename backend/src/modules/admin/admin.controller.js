const {
  loginAdmin,
  listAdmins,
  createAdmin,
  deleteAdmin,
  listPendingRegistrations,
  getRegistrationForAdmin,
  approveRegistration,
  rejectRegistration,
  listCorporates,
  createCorporate,
  createCorporateUser,
  listAllCases,
  reassignCase,
  listBillableCases,
  updateCaseBilling,
  searchPatients,
  VALID_TICKET_STATUSES,
  listAllTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
} = require('./admin.service');
const { updateCaseStage, getCaseById, VALID_CASE_STATUSES } = require('../cases/cases.service');
const { prisma } = require('../../db/prisma');
const path = require('path');
const { UPLOAD_DIR } = require('../../middleware/upload.middleware');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await loginAdmin(email, password);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    // The admin portal (admin.html) never reads result.token — it relies on this
    // httpOnly cookie instead, so a compromised script on the page can't read the
    // session out of localStorage. The token is still returned in the body too, for
    // the test suite and any other API client that authenticates via header instead.
    res.cookie('hc_admin_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // matches the access token's own 15-minute lifetime
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ ok: true, admin: req.user });
}

async function logout(req, res) {
  res.clearCookie('hc_admin_token');
  res.json({ message: 'Logged out.' });
}

async function getAdmins(req, res, next) {
  try {
    const admins = await listAdmins();
    res.json({ admins });
  } catch (err) {
    next(err);
  }
}

async function postAdmin(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const admin = await createAdmin({ name, email, password, role });
    res.status(201).json({ admin });
  } catch (err) {
    next(err);
  }
}

async function deleteAdminAccount(req, res, next) {
  try {
    await deleteAdmin(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getPendingRegistrations(req, res, next) {
  try {
    const registrations = await listPendingRegistrations();
    res.json({ registrations });
  } catch (err) {
    next(err);
  }
}

async function getRegistration(req, res, next) {
  try {
    res.json({ registration: await getRegistrationForAdmin(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function postApproveRegistration(req, res, next) {
  try {
    res.json({ registration: await approveRegistration(req.params.id, req.user.id) });
  } catch (err) {
    next(err);
  }
}

async function postRejectRegistration(req, res, next) {
  try {
    res.json({ registration: await rejectRegistration(req.params.id, req.body.reason) });
  } catch (err) {
    next(err);
  }
}

// Registration documents are never served as static files (same reasoning as every
// other upload in this app) — compliance has to be authenticated to open one.
async function downloadRegistrationDocument(req, res, next) {
  try {
    const registration = await getRegistrationForAdmin(req.params.id);
    const doc = registration.documents.find((d) => d.key === req.params.key);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filename = path.basename(doc.fileUrl);
    res.download(path.join(UPLOAD_DIR, filename), doc.fileName);
  } catch (err) {
    next(err);
  }
}

async function getCorporates(req, res, next) {
  try {
    const corporates = await listCorporates();
    res.json({ corporates });
  } catch (err) {
    next(err);
  }
}

async function postCorporate(req, res, next) {
  try {
    const { companyName, type } = req.body;
    if (!companyName || !type) return res.status(400).json({ error: 'companyName and type are required' });
    const corporate = await createCorporate({ companyName, type });
    res.status(201).json({ corporate });
  } catch (err) {
    next(err);
  }
}

async function postCorporateUser(req, res, next) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const corporateUser = await createCorporateUser(req.params.id, { email, password, role });
    res.status(201).json({ corporateUser });
  } catch (err) {
    next(err);
  }
}

async function getCases(req, res, next) {
  try {
    const cases = await listAllCases({ status: req.query.status, corporateId: req.query.corporateId });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

// Unlike the corporate-facing getCase, admin can view any case regardless of which
// corporate it belongs to — no ownership check.
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
    const { corporateId } = req.body;
    if (!corporateId) return res.status(400).json({ error: 'corporateId is required' });
    const caseRecord = await reassignCase(req.params.id, corporateId);
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
}

async function getBilling(req, res, next) {
  try {
    const cases = await listBillableCases({ status: req.query.status });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function patchCaseBilling(req, res, next) {
  try {
    const { amount, currency, status, notes } = req.body;
    const caseRecord = await updateCaseBilling(req.params.id, { amount, currency, status, notes });
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
//the function for getting the ticket with the help of the middleware
async function getTickets(req, res, next) {
  try {
    const tickets = await listAllTickets({ status: req.query.status });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

async function getTicket(req, res, next) {
  try {
    const ticket = await getTicketById(req.params.id);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

async function postTicketReply(req, res, next) {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });
    const admin = await prisma.adminUser.findUnique({ where: { id: req.user.id }, select: { name: true } });
    const ticket = await replyToTicket(req.params.id, admin?.name || 'HumanCare Support', body.trim());
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}
//the function
async function patchTicketStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: `status is required. Use one of: ${VALID_TICKET_STATUSES.join(', ')}` });
    const ticket = await updateTicketStatus(req.params.id, status);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  me,
  logout,
  getAdmins,
  postAdmin,
  deleteAdminAccount,
  getPendingRegistrations,
  getRegistration,
  postApproveRegistration,
  postRejectRegistration,
  downloadRegistrationDocument,
  getCorporates,
  postCorporate,
  postCorporateUser,
  getCases,
  getCase,
  patchCaseAssign,
  getBilling,
  patchCaseBilling,
  getPatients,
  patchCaseStage,
  getTickets,
  getTicket,
  postTicketReply,
  patchTicketStatus,
};
