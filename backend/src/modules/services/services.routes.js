const { Router } = require('express');
const { listServices, getService } = require('./services.controller');

const servicesRouter = Router();

servicesRouter.get('/', listServices);
servicesRouter.get('/:slug', getService);

module.exports = { servicesRouter };
