const { prisma } = require('../../db/prisma');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  issueOtp,
  verifyOtp,
} = require('./auth.service');

async function registerRequestOtp(req, res) {
  const { name, email, mobile } = req.body;
  if (!name || !email || !mobile) {
    return res.status(400).json({ error: 'name, email and mobile are required' });
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { mobile }] } });
  if (existing) {
    return res.status(409).json({ error: 'An account with that email or mobile number already exists.' });
  }

  const result = await issueOtp(mobile, 'patient_register');
  if (result.throttled) {
    return res.status(429).json({ error: `Please wait ${result.secondsLeft}s before requesting another code.`, secondsLeft: result.secondsLeft });
  }
  res.json({ message: 'OTP sent.' });
}

async function registerVerifyOtp(req, res) {
  const { name, email, mobile, countryCode, code } = req.body;
  if (!name || !email || !mobile || !code) {
    return res.status(400).json({ error: 'name, email, mobile and code are required' });
  }

  const result = await verifyOtp(mobile, 'patient_register', code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { mobile }] } });
  if (existing) {
    return res.status(409).json({ error: 'An account with that email or mobile number already exists.' });
  }

  const user = await prisma.user.create({
    data: { name, email, mobile, countryCode: countryCode || '+91' },
  });

  const token = signAccessToken({ sub: user.id, role: 'patient' });
  const refreshToken = signRefreshToken({ sub: user.id, role: 'patient' });
  const { passwordHash: _omit, ...safeUser } = user;
  res.status(201).json({ token, refreshToken, user: safeUser });
}

async function loginRequestOtp(req, res) {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'identifier (email or mobile) is required' });

  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { mobile: identifier }] } });
  if (user) {
    const result = await issueOtp(identifier, 'patient_login');
    if (result.throttled) {
      return res.status(429).json({ error: `Please wait ${result.secondsLeft}s before requesting another code.`, secondsLeft: result.secondsLeft });
    }
  }
  // Same response whether or not the account exists, so we don't reveal which emails/mobiles are registered.
  res.json({ message: 'If an account exists for that email or mobile number, an OTP has been sent.' });
}

async function loginVerifyOtp(req, res) {
  const { identifier, code } = req.body;
  if (!identifier || !code) return res.status(400).json({ error: 'identifier and code are required' });

  const result = await verifyOtp(identifier, 'patient_login', code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { mobile: identifier }] } });
  if (!user) return res.status(404).json({ error: 'Account not found' });

  const token = signAccessToken({ sub: user.id, role: 'patient' });
  const refreshToken = signRefreshToken({ sub: user.id, role: 'patient' });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ token, refreshToken, user: safeUser });
}

async function vendorLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const vendorUser = await prisma.vendorUser.findUnique({ where: { email }, include: { vendor: true } });
  if (!vendorUser) return res.status(401).json({ error: 'Invalid credentials' });

  const matches = await comparePassword(password, vendorUser.passwordHash);
  if (!matches) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAccessToken({ sub: vendorUser.id, role: 'vendor', vendorId: vendorUser.vendorId });
  const refreshToken = signRefreshToken({ sub: vendorUser.id, role: 'vendor', vendorId: vendorUser.vendorId });
  const { passwordHash: _omit, ...safeVendorUser } = vendorUser;
  res.json({ token, refreshToken, vendorUser: safeVendorUser });
}

async function refreshAccessToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const claims = { sub: payload.sub, role: payload.role, ...(payload.vendorId != null && { vendorId: payload.vendorId }) };
  const token = signAccessToken(claims);
  const newRefreshToken = signRefreshToken(claims);
  res.json({ token, refreshToken: newRefreshToken });
}

async function getMe(req, res) {
  if (req.user.role === 'vendor') {
    const vendorUser = await prisma.vendorUser.findUnique({ where: { id: req.user.id }, include: { vendor: true } });
    if (!vendorUser) return res.status(404).json({ error: 'Account not found' });
    const { passwordHash: _omit, ...safeVendorUser } = vendorUser;
    return res.json({ vendorUser: safeVendorUser });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ user: safeUser });
}

async function updateMe(req, res) {
  const { name, mobile, email, countryCode } = req.body;

  if (mobile) {
    const existing = await prisma.user.findFirst({ where: { mobile, NOT: { id: req.user.id } } });
    if (existing) return res.status(409).json({ error: 'That mobile number is already in use by another account.' });
  }
  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.id } } });
    if (existing) return res.status(409).json({ error: 'That email is already in use by another account.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(email && { email }),
      ...(countryCode && { countryCode }),
    },
  });
  const { passwordHash: _omit, ...safeUser } = user;
  res.json({ user: safeUser });
}

// Vendor accounts still use a password, so "forgot password" only applies to them —
// patients authenticate via OTP and have nothing to reset.
async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const vendorUser = await prisma.vendorUser.findUnique({ where: { email } });
  if (vendorUser) {
    const result = await issueOtp(email, 'vendor_password_reset');
    if (result.throttled) {
      return res.status(429).json({ error: `Please wait ${result.secondsLeft}s before requesting another code.`, secondsLeft: result.secondsLeft });
    }
  }
  // Same response whether or not the account exists, so we don't reveal which emails are registered.
  res.json({ message: 'If a vendor account exists for that email, a reset code has been sent.' });
}

async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'email, code and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const result = await verifyOtp(email, 'vendor_password_reset', code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const vendorUser = await prisma.vendorUser.findUnique({ where: { email } });
  if (!vendorUser) return res.status(404).json({ error: 'Account not found' });

  const passwordHash = await hashPassword(newPassword);
  await prisma.vendorUser.update({ where: { id: vendorUser.id }, data: { passwordHash } });
  res.json({ message: 'Password updated. Please log in with your new password.' });
}

module.exports = {
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
};
