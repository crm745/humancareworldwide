const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
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
} = require('./vendor-portal.controller');

// Mounted at /vendor (not /vendor/cases, which casesRouter already owns) — this is
// where new vendor-portal-web-app-specific endpoints live: dashboard, notifications,
// patients, tickets, profile, settings, search. Documents/invoices/bank details are
// deferred — see the self-registration flow they're tied to.
const vendorPortalRouter = Router();

vendorPortalRouter.get('/dashboard', requireAuth(['vendor']), getDashboard);

// Reuses the same Notification rows the shared /notifications endpoints do (role-aware
// there), just reshaped to the field names + DELETE support the vendor-portal expects.
vendorPortalRouter.get('/notifications', requireAuth(['vendor']), listNotifications);
vendorPortalRouter.patch('/notifications/:id', requireAuth(['vendor']), patchNotificationRead);
vendorPortalRouter.post('/notifications/read-all', requireAuth(['vendor']), markAllNotificationsRead);
vendorPortalRouter.delete('/notifications/:id', requireAuth(['vendor']), deleteNotificationRoute);

// "Patients" here are the patient-facing view of one Case each — see
// vendor-portal.service.js for why there's no separate Patient table.
vendorPortalRouter.get('/patients', requireAuth(['vendor']), listPatients);
vendorPortalRouter.get('/patients/:id', requireAuth(['vendor']), getPatient);
vendorPortalRouter.post('/patients/:id/communications', requireAuth(['vendor']), postPatientCommunication);

vendorPortalRouter.get('/tickets', requireAuth(['vendor']), listTickets);
vendorPortalRouter.post('/tickets', requireAuth(['vendor']), postTicket);
vendorPortalRouter.post('/tickets/:id/messages', requireAuth(['vendor']), postTicketMessage);

vendorPortalRouter.get('/profile', requireAuth(['vendor']), getProfile);
vendorPortalRouter.put('/profile/company', requireAuth(['vendor']), putCompany);
vendorPortalRouter.get('/settings', requireAuth(['vendor']), getSettings);
vendorPortalRouter.put('/settings', requireAuth(['vendor']), putSettings);
vendorPortalRouter.get('/search', requireAuth(['vendor']), search);

module.exports = { vendorPortalRouter };
