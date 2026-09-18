const { prisma } = require('../../db/prisma');
const {
  signAccessToken,
  signRefreshToken,
  hashPassword,
  comparePassword,
} = require('./auth.service');

async function registerPatient(req, res) {
  const { name, email, mobile, password, countryCode } = req.body;
  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ error: 'name, email, mobile and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { mobile }] } });
  if (existing) {
    return res.status(409).json({ error: 'An account with that email or mobile number already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, mobile, passwordHash, countryCode: countryCode || '+91' },
  });

  const token = signAccessToken({ sub: user.id, role: 'patient' });
  const refreshToken = signRefreshToken({ sub: user.id, role: 'patient' });
  const { passwordHash: _omit, ...safeUser } = user;
  res.status(201).json({ token, refreshToken, user: safeUser });
}

async function loginPatient(req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier (email or mobile) and password are required' });
  }

  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { mobile: identifier }] } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
//  
  const matches = await comparePassword(password, user.passwordHash);
  if (!matches) return res.status(401).json({ error: 'Invalid credentials' });

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

module.exports = { registerPatient, loginPatient, vendorLogin };
