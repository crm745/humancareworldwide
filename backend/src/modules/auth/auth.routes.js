const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  googleLogin,
  appleLogin,
  corporateLogin,
  corporateVerifyOtp,
  refreshAccessToken,
  getMe,
  updateMe,
  savePushToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  corporateLogout,
} = require('./auth.controller');

const authRouter = Router();

// Patients authenticate via OTP, Google, or Apple — no password.
authRouter.post('/register/request-otp', registerRequestOtp);
authRouter.post('/register/verify-otp', registerVerifyOtp);
authRouter.post('/login/request-otp', loginRequestOtp);
authRouter.post('/login/verify-otp', loginVerifyOtp);
authRouter.post('/google', googleLogin);
authRouter.post('/apple', appleLogin);

// Corporates authenticate with password + OTP (two factors, since these accounts
// can see patient case/medical data).
authRouter.post('/corporate/login', corporateLogin);
authRouter.post('/corporate/otp/verify', corporateVerifyOtp);
authRouter.post('/forgot-password', requestPasswordReset);
authRouter.post('/reset-password', resetPassword);
// Same two handlers, reachable under /corporate/* too — the corporate-portal web app calls
// them by this name; patients never had a password to reset in the first place.
authRouter.post('/corporate/forgot-password', requestPasswordReset);
authRouter.post('/corporate/reset-password', resetPassword);
authRouter.post('/corporate/change-password', requireAuth(['corporate']), changePassword);
authRouter.post('/corporate/logout', corporateLogout);

authRouter.post('/refresh', refreshAccessToken);
authRouter.get('/me', requireAuth(), getMe);
authRouter.patch('/me', requireAuth(['patient']), updateMe);
authRouter.post('/push-token', requireAuth(['patient']), savePushToken);

module.exports = { authRouter };
