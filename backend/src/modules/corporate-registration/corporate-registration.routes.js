const { Router } = require('express');
const { upload } = require('../../middleware/upload.middleware');
const { otpRequestLimiter } = require('../../middleware/rate-limit.middleware');
const {
  postRegister,
  getRegistration,
  postResendVerification,
  patchEmail,
  getVerifyEmail,
  postCredentials,
  DOCUMENT_KEYS,
} = require('./corporate-registration.controller');

const corporateRegistrationRouter = Router();

// Public (no account exists yet) — the corporate-portal's /register wizard.
corporateRegistrationRouter.post(
  '/register',
  otpRequestLimiter,
  upload.fields(DOCUMENT_KEYS.map((key) => ({ name: key, maxCount: 1 }))),
  postRegister,
);
corporateRegistrationRouter.get('/registrations/:id', getRegistration);
corporateRegistrationRouter.post('/registrations/:id/resend-verification', otpRequestLimiter, postResendVerification);
corporateRegistrationRouter.patch('/registrations/:id/email', patchEmail);
corporateRegistrationRouter.get('/verify-email', getVerifyEmail);
corporateRegistrationRouter.post('/registrations/:id/credentials', postCredentials);

module.exports = { corporateRegistrationRouter };
