const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  vendorLogin,
  refreshAccessToken,
  getMe,
  updateMe,
  requestPasswordReset,
  resetPassword,
} = require('./auth.controller');

const authRouter = Router();

// Patients authenticate via OTP only — no password.
authRouter.post('/register/request-otp', registerRequestOtp);
authRouter.post('/register/verify-otp', registerVerifyOtp);
authRouter.post('/login/request-otp', loginRequestOtp);
authRouter.post('/login/verify-otp', loginVerifyOtp);

// Vendors still authenticate with a password.
authRouter.post('/vendor/login', vendorLogin);
authRouter.post('/forgot-password', requestPasswordReset);
authRouter.post('/reset-password', resetPassword);

authRouter.post('/refresh', refreshAccessToken);
authRouter.get('/me', requireAuth(), getMe);
authRouter.patch('/me', requireAuth(['patient']), updateMe);

module.exports = { authRouter };
