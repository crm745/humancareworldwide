const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { loginLimiter } = require('../../middleware/rate-limit.middleware');
const {
  login,
  me,
  logout,
  getCorporates,
  postCorporate,
  postCorporateUser,
  getCases,
  getCase,
  patchCaseAssign,
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

adminRouter.get('/corporates', getCorporates);
adminRouter.post('/corporates', postCorporate);
adminRouter.post('/corporates/:id/users', postCorporateUser);

adminRouter.get('/cases', getCases);
adminRouter.get('/cases/:id', getCase);
adminRouter.patch('/cases/:id/assign', patchCaseAssign);
adminRouter.patch('/cases/:id/stage', patchCaseStage);

adminRouter.get('/patients', getPatients);

adminRouter.get('/tickets', getTickets);
adminRouter.get('/tickets/:id', getTicket);
adminRouter.post('/tickets/:id/messages', postTicketReply);
adminRouter.patch('/tickets/:id/status', patchTicketStatus);

adminRouter.get('/services', listServices);
adminRouter.post('/services', createService);
adminRouter.patch('/services/:slug', updateService);
adminRouter.delete('/services/:slug', deleteService);

module.exports = { adminRouter };
