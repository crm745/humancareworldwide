const { prisma } = require('../../db/prisma');

async function listNotificationsFor(recipientType, recipientId, { unreadOnly } = {}) {
  const where = { recipientType, recipientId };
  if (unreadOnly === 'true' || unreadOnly === true) where.readAt = null;
  return prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
}

async function markRead(recipientType, recipientId, id) {
  const notification = await prisma.notification.findFirst({ where: { id: Number(id), recipientType, recipientId } });
  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  return prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
}

async function markAllRead(recipientType, recipientId) {
  await prisma.notification.updateMany({
    where: { recipientType, recipientId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

module.exports = { listNotificationsFor, markRead, markAllRead };
