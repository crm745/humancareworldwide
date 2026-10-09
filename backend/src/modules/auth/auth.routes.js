const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  googleLogin,
  appleLogin,
  vendorLogin,
  vendorVerifyOtp,
  refreshAccessToken,
  getMe,
  updateMe,
  savePushToken,
  requestPasswordReset,
  resetPassword,
} = require('./auth.controller');

const authRouter = Router();

// Patients authenticate via OTP, Google, or Apple — no password.
authRouter.post('/register/request-otp', registerRequestOtp);
authRouter.post('/register/verify-otp', registerVerifyOtp);
authRouter.post('/login/request-otp', loginRequestOtp);
authRouter.post('/login/verify-otp', loginVerifyOtp);
authRouter.post('/google', googleLogin);
authRouter.post('/apple', appleLogin);

// Vendors authenticate with password + OTP (two factors, since these accounts
// can see patient case/medical data).
authRouter.post('/vendor/login', vendorLogin);
authRouter.post('/vendor/otp/verify', vendorVerifyOtp);
authRouter.post('/forgot-password', requestPasswordReset);
authRouter.post('/reset-password', resetPassword);

authRouter.post('/refresh', refreshAccessToken);
authRouter.get('/me', requireAuth(), getMe);
authRouter.patch('/me', requireAuth(['patient']), updateMe);
authRouter.post('/push-token', requireAuth(['patient']), savePushToken);

module.exports = { authRouter };
