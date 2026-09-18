const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');
const {
  submitRequest,
  listMyRequests,
  getMyRequestById,
  trackByReference,
  uploadRequestDocument,
} = require('./requests.controller');

const requestsRouter = Router();

requestsRouter.post('/', requireAuth(['patient']), submitRequest);
requestsRouter.get('/me', requireAuth(['patient']), listMyRequests);
requestsRouter.get('/me/:id', requireAuth(['patient']), getMyRequestById);
requestsRouter.post('/me/:id/documents', requireAuth(['patient']), upload.single('file'), uploadRequestDocument);
requestsRouter.get('/track/:ref', trackByReference); // guest lookup, no auth — gated by mobile match instead

module.exports = { requestsRouter };
