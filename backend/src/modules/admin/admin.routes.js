const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  login,
  getVendors,
  postVendor,
  postVendorUser,
  getCases,
  patchCaseAssign,
  getPatients,
  patchCaseStage,
} = require('./admin.controller');
const {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require('../services/services.controller');

const adminRouter = Router();

adminRouter.post('/login', login);

adminRouter.use(requireAuth(['admin']));

adminRouter.get('/vendors', getVendors);
adminRouter.post('/vendors', postVendor);
adminRouter.post('/vendors/:id/users', postVendorUser);

adminRouter.get('/cases', getCases);
adminRouter.patch('/cases/:id/assign', patchCaseAssign);
adminRouter.patch('/cases/:id/stage', patchCaseStage);

adminRouter.get('/patients', getPatients);

adminRouter.get('/services', listServices);
adminRouter.post('/services', createService);
adminRouter.patch('/services/:slug', updateService);
adminRouter.delete('/services/:slug', deleteService);

module.exports = { adminRouter };
