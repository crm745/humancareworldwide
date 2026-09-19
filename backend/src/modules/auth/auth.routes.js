const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  registerPatient,
  loginPatient,
  vendorLogin,
  refreshAccessToken,
  getMe,
  updateMe,
  requestPasswordReset,
  resetPassword,
} = require('./auth.controller');

const authRouter = Router();

authRouter.post('/register', registerPatient);
authRouter.post('/login', loginPatient);
authRouter.post('/vendor/login', vendorLogin);
authRouter.post('/refresh', refreshAccessToken);
authRouter.get('/me', requireAuth(), getMe);
authRouter.patch('/me', requireAuth(['patient']), updateMe);
authRouter.post('/forgot-password', requestPasswordReset);
authRouter.post('/reset-password', resetPassword);

module.exports = { authRouter };
