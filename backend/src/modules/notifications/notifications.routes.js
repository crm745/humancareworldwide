const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { listMine, markOneRead, markAllMineRead } = require('./notifications.controller');

const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth(), listMine);
notificationsRouter.post('/:id/read', requireAuth(), markOneRead);
notificationsRouter.post('/read-all', requireAuth(), markAllMineRead);

module.exports = { notificationsRouter };
