const { prisma } = require('../../db/prisma');
const { hashPassword, comparePassword, signAccessToken, signRefreshToken } = require('../auth/auth.service');
const { VALID_CASE_STATUSES } = require('../cases/cases.service');

async function loginAdmin(email, password) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return null;
  const matches = await comparePassword(password, admin.passwordHash);
  if (!matches) return null;

  const token = signAccessToken({ sub: admin.id, role: 'admin' });
  const refreshToken = signRefreshToken({ sub: admin.id, role: 'admin' });
  const { passwordHash: _omit, ...safeAdmin } = admin;
  return { token, refreshToken, admin: safeAdmin };
}

async function listVendors() {
  return prisma.vendor.findMany({
    include: { users: { select: { id: true, email: true, role: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function createVendor({ companyName, type }) {
  return prisma.vendor.create({ data: { companyName, type } });
}

async function createVendorUser(vendorId, { email, password, role }) {
  const vendor = await prisma.vendor.findUnique({ where: { id: Number(vendorId) } });
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }
  const existing = await prisma.vendorUser.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('A vendor user with that email already exists.');
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const vendorUser = await prisma.vendorUser.create({
    data: { vendorId: vendor.id, email, passwordHash, role: role || 'viewer' },
  });
  const { passwordHash: _omit, ...safeVendorUser } = vendorUser;
  return safeVendorUser;
}

async function listAllCases({ status, vendorId } = {}) {
  const where = {};
  if (status && status !== 'all') {
    if (!VALID_CASE_STATUSES.includes(status)) {
      const err = new Error(`Invalid status filter. Use one of: ${VALID_CASE_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    where.status = status;
  }
  if (vendorId) where.vendorId = Number(vendorId);

  return prisma.case.findMany({
    where,
    include: { vendor: { select: { id: true, companyName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function reassignCase(caseId, vendorId) {
  const vendor = await prisma.vendor.findUnique({ where: { id: Number(vendorId) } });
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }
  const caseRecord = await prisma.case.findUnique({ where: { id: Number(caseId) } });
  if (!caseRecord) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }
  const updated = await prisma.case.update({ where: { id: caseRecord.id }, data: { vendorId: vendor.id } });
  await prisma.caseStageEvent.create({
    data: { caseId: caseRecord.id, stage: caseRecord.status, note: `Reassigned to ${vendor.companyName} by admin.` },
  });
  return updated;
}

async function searchPatients(search) {
  if (!search) return prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

module.exports = {
  loginAdmin,
  listVendors,
  createVendor,
  createVendorUser,
  listAllCases,
  reassignCase,
  searchPatients,
};
