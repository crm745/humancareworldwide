const express = require('express');
const cors = require('cors');
const { authRouter } = require('./modules/auth/auth.routes');
const { requestsRouter } = require('./modules/requests/requests.routes');
const { casesRouter } = require('./modules/cases/cases.routes');
const { notificationsRouter } = require('./modules/notifications/notifications.routes');
const { servicesRouter } = require('./modules/services/services.routes');
const { adminRouter } = require('./modules/admin/admin.routes');
const { documentsRouter } = require('./modules/documents/documents.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Uploaded files (medical reports, etc.) are never served as static files — every
// download goes through documentsRouter, which checks the requester actually owns
// the document before streaming it. See documents.controller.js.
app.use('/auth', authRouter);
app.use('/services', servicesRouter);
app.use('/requests', requestsRouter);
app.use('/vendor/cases', casesRouter);
app.use('/notifications', notificationsRouter);
app.use('/admin', adminRouter);
app.use('/documents', documentsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const isUploadError = err.name === 'MulterError' || /Unsupported file type/.test(err.message || '');
  const status = err.statusCode || (isUploadError ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

module.exports = { app };
