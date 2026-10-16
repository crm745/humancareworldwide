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
} = require('./corporate-portal.controller');

// Mounted at /corporate (not /corporate/cases, which casesRouter already owns) — this is
// where new corporate-portal-web-app-specific endpoints live: dashboard, notifications,
// patients, tickets, profile, settings, search. Documents/invoices/bank details are
// deferred — see the self-registration flow they're tied to.
const corporatePortalRouter = Router();

corporatePortalRouter.get('/dashboard', requireAuth(['corporate']), getDashboard);

// Reuses the same Notification rows the shared /notifications endpoints do (role-aware
// there), just reshaped to the field names + DELETE support the corporate-portal expects.
corporatePortalRouter.get('/notifications', requireAuth(['corporate']), listNotifications);
corporatePortalRouter.patch('/notifications/:id', requireAuth(['corporate']), patchNotificationRead);
corporatePortalRouter.post('/notifications/read-all', requireAuth(['corporate']), markAllNotificationsRead);
corporatePortalRouter.delete('/notifications/:id', requireAuth(['corporate']), deleteNotificationRoute);

// "Patients" here are the patient-facing view of one Case each — see
// corporate-portal.service.js for why there's no separate Patient table.
corporatePortalRouter.get('/patients', requireAuth(['corporate']), listPatients);
corporatePortalRouter.get('/patients/:id', requireAuth(['corporate']), getPatient);
corporatePortalRouter.post('/patients/:id/communications', requireAuth(['corporate']), postPatientCommunication);

corporatePortalRouter.get('/tickets', requireAuth(['corporate']), listTickets);
corporatePortalRouter.post('/tickets', requireAuth(['corporate']), postTicket);
corporatePortalRouter.post('/tickets/:id/messages', requireAuth(['corporate']), postTicketMessage);

corporatePortalRouter.get('/profile', requireAuth(['corporate']), getProfile);
corporatePortalRouter.put('/profile/company', requireAuth(['corporate']), putCompany);
corporatePortalRouter.get('/settings', requireAuth(['corporate']), getSettings);
corporatePortalRouter.put('/settings', requireAuth(['corporate']), putSettings);
corporatePortalRouter.get('/search', requireAuth(['corporate']), search);

module.exports = { corporatePortalRouter };
