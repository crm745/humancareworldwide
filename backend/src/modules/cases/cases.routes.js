const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');
const {
  listMyCases,
  getCase,
  createCase,
  uploadCaseDocument,
} = require('./cases.controller');

const casesRouter = Router();

// Insurance/Government/Corporate vendors submit on behalf of someone they cover, and
// track it — they don't claim or work cases themselves. See cases.service.js.
casesRouter.get('/', requireAuth(['vendor']), listMyCases);
casesRouter.get('/:id', requireAuth(['vendor']), getCase);
casesRouter.post('/', requireAuth(['vendor']), createCase);
casesRouter.post('/:id/documents', requireAuth(['vendor']), upload.single('file'), uploadCaseDocument);

module.exports = { casesRouter };
