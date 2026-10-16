const { listNotificationsFor, markRead, markAllRead } = require('./notifications.service');

function recipientFor(req) {
  return req.user.role === 'corporate'
    ? { recipientType: 'corporate_user', recipientId: req.user.id }
    : { recipientType: 'patient', recipientId: req.user.id };
}

async function listMine(req, res, next) {
  try {
    const { recipientType, recipientId } = recipientFor(req);
    const notifications = await listNotificationsFor(recipientType, recipientId, { unreadOnly: req.query.unreadOnly });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

async function markOneRead(req, res, next) {
  try {
    const { recipientType, recipientId } = recipientFor(req);
    const notification = await markRead(recipientType, recipientId, req.params.id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

async function markAllMineRead(req, res, next) {
  try {
    const { recipientType, recipientId } = recipientFor(req);
    await markAllRead(recipientType, recipientId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, markOneRead, markAllMineRead };
