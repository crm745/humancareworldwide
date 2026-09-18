const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');
const {
  listMyCases,
  listUnassigned,
  getCase,
  claimCase,
  createCase,
  updateStage,
  uploadCaseDocument,
} = require('./cases.controller');

const casesRouter = Router();

casesRouter.get('/', requireAuth(['vendor']), listMyCases);
casesRouter.get('/unassigned', requireAuth(['vendor']), listUnassigned);
casesRouter.get('/:id', requireAuth(['vendor']), getCase);
casesRouter.post('/', requireAuth(['vendor']), createCase);
casesRouter.post('/:id/claim', requireAuth(['vendor']), claimCase);
casesRouter.patch('/:id/stage', requireAuth(['vendor']), updateStage);
casesRouter.post('/:id/documents', requireAuth(['vendor']), upload.single('file'), uploadCaseDocument);

module.exports = { casesRouter };
