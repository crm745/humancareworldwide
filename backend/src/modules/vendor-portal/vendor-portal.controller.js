const { prisma } = require('../../db/prisma');
const {
  getDashboardStats,
  listVendorNotifications,
  setVendorNotificationRead,
  markAllVendorNotificationsRead,
  deleteVendorNotification,
  listVendorPatients,
  getVendorPatient,
  addPatientCommunication,
  listVendorTickets,
  createVendorTicket,
  addTicketMessage,
  getVendorProfile,
  updateVendorCompany,
  getVendorSettings,
  updateVendorSettings,
  searchVendor,
} = require('./vendor-portal.service');

const VALID_RANGES = ['today', 'week', 'month', 'quarter', 'year'];

// We don't have a "contact name" field on VendorUser — their login email is the best
// available stand-in for attributing something they wrote (a note, a ticket message).
async function getAuthorName(req) {
  const vendorUser = await prisma.vendorUser.findUnique({ where: { id: req.user.id } });
  return vendorUser?.email;
}

async function getDashboard(req, res, next) {
  try {
    const range = VALID_RANGES.includes(req.query.range) ? req.query.range : 'month';
    const data = await getDashboardStats(req.user.vendorId, range);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function listNotifications(req, res, next) {
  try {
    const notifications = await listVendorNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

async function patchNotificationRead(req, res, next) {
  try {
    const read = req.body.read !== false; // defaults to true, matching the frontend's usual call shape
    const notification = await setVendorNotificationRead(req.user.id, req.params.id, read);
    res.json(notification);
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await markAllVendorNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteNotificationRoute(req, res, next) {
  try {
    await deleteVendorNotification(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listPatients(req, res, next) {
  try {
    const patients = await listVendorPatients(req.user.vendorId);
    res.json(patients);
  } catch (err) {
    next(err);
  }
}

async function getPatient(req, res, next) {
  try {
    const patient = await getVendorPatient(req.user.vendorId, req.params.id);
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function postPatientCommunication(req, res, next) {
  try {
    const { summary, channel } = req.body;
    if (!summary || !channel) return res.status(400).json({ error: 'summary and channel are required' });
    const authorName = await getAuthorName(req);
    const entry = await addPatientCommunication(req.user.vendorId, req.params.id, { summary, channel, authorName });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

async function listTickets(req, res, next) {
  try {
    const tickets = await listVendorTickets(req.user.vendorId);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}

async function postTicket(req, res, next) {
  try {
    const { subject, category, priority, description } = req.body;
    if (!subject || !category || !description) {
      return res.status(400).json({ error: 'subject, category and description are required' });
    }
    const authorName = await getAuthorName(req);
    const ticket = await createVendorTicket(req.user.vendorId, authorName, { subject, category, priority, description });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

async function postTicketMessage(req, res, next) {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'body is required' });
    const authorName = await getAuthorName(req);
    const ticket = await addTicketMessage(req.user.vendorId, req.params.id, authorName, body);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    res.json(await getVendorProfile(req.user.vendorId));
  } catch (err) {
    next(err);
  }
}

async function putCompany(req, res, next) {
  try {
    res.json(await updateVendorCompany(req.user.vendorId, req.body));
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    res.json(await getVendorSettings(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function putSettings(req, res, next) {
  try {
    res.json(await updateVendorSettings(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    res.json(await searchVendor(req.user.vendorId, req.query.q));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  listNotifications,
  patchNotificationRead,
  markAllNotificationsRead,
  deleteNotificationRoute,
  listPatients,
  getPatient,
  postPatientCommunication,
  listTickets,
  postTicket,
  postTicketMessage,
  getProfile,
  putCompany,
  getSettings,
  putSettings,
  search,
};
