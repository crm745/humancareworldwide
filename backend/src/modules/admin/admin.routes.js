const { Router } = require('express');
const { requireAuth, requireSuperAdmin } = require('../../middleware/auth.middleware');
const { loginLimiter } = require('../../middleware/rate-limit.middleware');
const {
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
} = require('./admin.controller');
const {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require('../services/services.controller');

const adminRouter = Router();

adminRouter.post('/login', loginLimiter, login);

adminRouter.use(requireAuth(['admin']));

adminRouter.get('/me', me);
adminRouter.post('/logout', logout);

// Admin-account management is superadmin-only.
adminRouter.get('/admins', requireSuperAdmin, getAdmins);
adminRouter.post('/admins', requireSuperAdmin, postAdmin);
adminRouter.delete('/admins/:id', requireSuperAdmin, deleteAdminAccount);

// Corporate-registration review — creating a real Corporate/CorporateUser account is
// the same sensitive-settings tier as admin-account management above.
adminRouter.get('/corporate-registrations', requireSuperAdmin, getPendingRegistrations);
adminRouter.get('/corporate-registrations/:id', requireSuperAdmin, getRegistration);
adminRouter.post('/corporate-registrations/:id/approve', requireSuperAdmin, postApproveRegistration);
adminRouter.post('/corporate-registrations/:id/reject', requireSuperAdmin, postRejectRegistration);
adminRouter.get('/corporate-registrations/:id/documents/:key', requireSuperAdmin, downloadRegistrationDocument);

adminRouter.get('/corporates', getCorporates);
adminRouter.post('/corporates', postCorporate);
adminRouter.post('/corporates/:id/users', postCorporateUser);

adminRouter.get('/cases', getCases);
adminRouter.get('/cases/:id', getCase);
adminRouter.patch('/cases/:id/assign', patchCaseAssign);
adminRouter.patch('/cases/:id/stage', patchCaseStage);

// Billing — step 1, a manual Ops/Finance tracker, same access level as the rest of
// case data (not a sensitive-settings action like admin accounts or the catalog).
adminRouter.get('/billing', getBilling);
adminRouter.patch('/cases/:id/billing', patchCaseBilling);

adminRouter.get('/patients', getPatients);

adminRouter.get('/tickets', getTickets);
adminRouter.get('/tickets/:id', getTicket);
adminRouter.post('/tickets/:id/messages', postTicketReply);
adminRouter.patch('/tickets/:id/status', patchTicketStatus);

// Viewing the catalog is fine for any admin; changing what patients see is a
// sensitive-settings action, so it's superadmin-only.
adminRouter.get('/services', listServices);
adminRouter.post('/services', requireSuperAdmin, createService);
adminRouter.patch('/services/:slug', requireSuperAdmin, updateService);
adminRouter.delete('/services/:slug', requireSuperAdmin, deleteService);

module.exports = { adminRouter };
