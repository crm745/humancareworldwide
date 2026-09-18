require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { authRouter } = require('./modules/auth/auth.routes');
const { requestsRouter } = require('./modules/requests/requests.routes');
const { casesRouter } = require('./modules/cases/cases.routes');
const { notificationsRouter } = require('./modules/notifications/notifications.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/auth', authRouter);
app.use('/requests', requestsRouter);
app.use('/vendor/cases', casesRouter);
app.use('/notifications', notificationsRouter);

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

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`HumanCare backend listening on http://localhost:${port}`);
});
