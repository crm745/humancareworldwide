const { prisma } = require('../../db/prisma');
const { hashPassword, comparePassword, signAccessToken, signRefreshToken } = require('../auth/auth.service');
const { VALID_CASE_STATUSES } = require('../cases/cases.service');
const { ticketIdFor, ticketDbIdFrom, TICKET_STATUS_LABEL } = require('../corporate-portal/corporate-portal.service');
const { getRegistrationOr404, toAdminRegistration } = require('../corporate-registration/corporate-registration.service');

async function loginAdmin(email, password) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return null;
  const matches = await comparePassword(password, admin.passwordHash);
  if (!matches) return null;

  // role stays the generic 'admin' tier for requireAuth(['admin']) — adminRole carries
  // the actual admin/superadmin distinction, checked separately by requireSuperAdmin.
  const token = signAccessToken({ sub: admin.id, role: 'admin', adminRole: admin.role });
  const refreshToken = signRefreshToken({ sub: admin.id, role: 'admin', adminRole: admin.role });
  const { passwordHash: _omit, ...safeAdmin } = admin;
  return { token, refreshToken, admin: safeAdmin };
}

const VALID_ADMIN_ROLES = ['admin', 'superadmin'];

async function listAdmins() {
  return prisma.adminUser.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function createAdmin({ name, email, password, role }) {
  if (role && !VALID_ADMIN_ROLES.includes(role)) {
    const err = new Error(`role must be one of: ${VALID_ADMIN_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('An admin with that email already exists.');
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const admin = await prisma.adminUser.create({
    data: { name, email, passwordHash, role: role || 'admin' },
  });
  const { passwordHash: _omit, ...safeAdmin } = admin;
  return safeAdmin;
}

// A superadmin can't demote/delete themselves — otherwise the last person able to
// manage admin accounts could accidentally lock themselves (and everyone else) out.
async function deleteAdmin(adminId, requestingAdminId) {
  if (Number(adminId) === Number(requestingAdminId)) {
    const err = new Error('You cannot remove your own admin account.');
    err.statusCode = 400;
    throw err;
  }
  const admin = await prisma.adminUser.findUnique({ where: { id: Number(adminId) } });
  if (!admin) {
    const err = new Error('Admin not found');
    err.statusCode = 404;
    throw err;
  }
  await prisma.adminUser.delete({ where: { id: admin.id } });
}

// ---------- corporate registration approvals ----------
// New corporate partners are onboarded through corporate-portal's /register wizard,
// then reviewed here before they can set a password and actually log in. This
// "approved" flag is what represents HumanCare's own compliance/bank-verification
// review (up to 48 hours) — distinct from the registrant's own email verification.
async function listPendingRegistrations() {
  const regs = await prisma.corporateRegistration.findMany({
    where: { credentialsCreated: false, rejectedAt: null },
    orderBy: { submittedAt: 'asc' },
  });
  return regs.map(toAdminRegistration);
}

async function getRegistrationForAdmin(id) {
  return toAdminRegistration(await getRegistrationOr404(id));
}

async function approveRegistration(id, adminId) {
  const reg = await getRegistrationOr404(id);
  if (reg.rejectedAt) {
    const err = new Error('This registration was already rejected.');
    err.statusCode = 409;
    throw err;
  }
  const updated = await prisma.corporateRegistration.update({
    where: { id: reg.id },
    data: { approved: true, approvedBy: Number(adminId), approvedAt: new Date() },
  });
  return toAdminRegistration(updated);
}

async function rejectRegistration(id, reason) {
  const reg = await getRegistrationOr404(id);
  const updated = await prisma.corporateRegistration.update({
    where: { id: reg.id },
    data: { approved: false, rejectedAt: new Date(), rejectionReason: reason || null },
  });
  return toAdminRegistration(updated);
}

// Corporate logins don't have a password-value history (never store old passwords —
// that's a security anti-pattern). This is just an event log of when a reset was
// requested/completed, read straight off the OTP records already created for that flow.
async function listCorporates() {
  const corporates = await prisma.corporate.findMany({
    include: { users: { select: { id: true, email: true, role: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const emails = corporates.flatMap((v) => v.users.map((u) => u.email));
  const resets = emails.length
    ? await prisma.otpCode.findMany({
        where: { identifier: { in: emails }, purpose: 'corporate_password_reset' },
        orderBy: { createdAt: 'desc' },
        select: { identifier: true, createdAt: true, consumedAt: true },
      })
    : [];

  return corporates.map((v) => ({
    ...v,
    users: v.users.map((u) => ({
      ...u,
      passwordResetHistory: resets.filter((r) => r.identifier === u.email),
    })),
  }));
}

async function createCorporate({ companyName, type }) {
  return prisma.corporate.create({ data: { companyName, type } });
}

async function createCorporateUser(corporateId, { email, password, role }) {
  const corporate = await prisma.corporate.findUnique({ where: { id: Number(corporateId) } });
  if (!corporate) {
    const err = new Error('Corporate not found');
    err.statusCode = 404;
    throw err;
  }
  const existing = await prisma.corporateUser.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('A corporate user with that email already exists.');
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const corporateUser = await prisma.corporateUser.create({
    data: { corporateId: corporate.id, email, passwordHash, role: role || 'viewer' },
  });
  const { passwordHash: _omit, ...safeCorporateUser } = corporateUser;
  return safeCorporateUser;
}

async function listAllCases({ status, corporateId } = {}) {
  const where = {};
  if (status && status !== 'all') {
    if (!VALID_CASE_STATUSES.includes(status)) {
      const err = new Error(`Invalid status filter. Use one of: ${VALID_CASE_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    where.status = status;
  }
  if (corporateId) where.corporateId = Number(corporateId);

  return prisma.case.findMany({
    where,
    include: { corporate: { select: { id: true, companyName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function reassignCase(caseId, corporateId) {
  const corporate = await prisma.corporate.findUnique({ where: { id: Number(corporateId) } });
  if (!corporate) {
    const err = new Error('Corporate not found');
    err.statusCode = 404;
    throw err;
  }
  const caseRecord = await prisma.case.findUnique({ where: { id: Number(caseId) } });
  if (!caseRecord) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }
  const updated = await prisma.case.update({ where: { id: caseRecord.id }, data: { corporateId: corporate.id } });
  await prisma.caseStageEvent.create({
    data: { caseId: caseRecord.id, stage: caseRecord.status, note: `Reassigned to ${corporate.companyName} by admin.` },
  });
  return updated;
}

// ---------- billing (step 1: a plain record Ops/Finance fills in by hand — no
// payment gateway yet, see the schema comment on Case) ----------
const VALID_BILLING_STATUSES = ['pending', 'invoiced', 'paid', 'overdue'];

function toBillingCase(c) {
  return {
    id: c.id,
    referenceNumber: c.referenceNumber,
    patientName: c.patientName,
    serviceType: c.serviceType,
    status: c.status,
    corporate: c.corporate ? { id: c.corporate.id, companyName: c.corporate.companyName } : null,
    createdAt: c.createdAt,
    billingAmount: c.billingAmount == null ? null : Number(c.billingAmount),
    billingCurrency: c.billingCurrency,
    billingStatus: c.billingStatus,
    billingInvoicedAt: c.billingInvoicedAt,
    billingPaidAt: c.billingPaidAt,
    billingNotes: c.billingNotes,
  };
}

async function listBillableCases({ status } = {}) {
  const where = {};
  if (status && status !== 'all') {
    if (!VALID_BILLING_STATUSES.includes(status)) {
      const err = new Error(`Invalid status filter. Use one of: ${VALID_BILLING_STATUSES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    where.billingStatus = status;
  }
  const cases = await prisma.case.findMany({
    where,
    include: { corporate: { select: { id: true, companyName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return cases.map(toBillingCase);
}

async function updateCaseBilling(caseId, { amount, currency, status, notes }) {
  if (status && !VALID_BILLING_STATUSES.includes(status)) {
    const err = new Error(`billingStatus must be one of: ${VALID_BILLING_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const caseRecord = await prisma.case.findUnique({ where: { id: Number(caseId) } });
  if (!caseRecord) {
    const err = new Error('Case not found');
    err.statusCode = 404;
    throw err;
  }

  const data = {};
  if (amount !== undefined) data.billingAmount = amount === null || amount === '' ? null : amount;
  if (currency !== undefined) data.billingCurrency = currency || null;
  if (notes !== undefined) data.billingNotes = notes || null;
  if (status) {
    data.billingStatus = status;
    // Stamp the transition date the first time a case enters that status — an admin
    // correcting a status back and forth later doesn't keep overwriting it.
    if (status === 'invoiced' && !caseRecord.billingInvoicedAt) data.billingInvoicedAt = new Date();
    if (status === 'paid' && !caseRecord.billingPaidAt) data.billingPaidAt = new Date();
  }

  const updated = await prisma.case.update({
    where: { id: caseRecord.id },
    data,
    include: { corporate: { select: { id: true, companyName: true } } },
  });
  return toBillingCase(updated);
}

// No login-activity tracking exists for patients (OTP auth doesn't stamp a "last seen").
// "Active" is a stand-in signal instead: have they actually submitted a request recently.
const ACTIVE_WINDOW_DAYS = 90;

async function searchPatients(search) {
  const where = search
    ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { mobile: { contains: search } }] }
    : undefined;
  const patients = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });

  const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recentRequests = await prisma.serviceRequest.findMany({
    where: { userId: { in: patients.map((p) => p.id) }, createdAt: { gte: since } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const activeIds = new Set(recentRequests.map((r) => r.userId));

  return patients.map((p) => ({ ...p, isActive: activeIds.has(p.id) }));
}

// ---------- support tickets ----------
// Reuses the corporate-portal's own HCW-TKT-00001 id format and status labels so the
// ticket id an admin sees here is exactly the one the corporate sees on their side.
const VALID_TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const TICKET_INCLUDE = {
  corporate: { select: { id: true, companyName: true } },
  messages: { orderBy: { createdAt: 'asc' } },
};

function toAdminTicket(t) {
  return {
    id: ticketIdFor(t.id),
    corporate: { id: t.corporate.id, companyName: t.corporate.companyName },
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: TICKET_STATUS_LABEL[t.status] || t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages.map((m) => ({ id: m.id, from: m.authorRole || 'corporate', author: m.authorName, date: m.createdAt, body: m.body })),
  };
}

async function findTicketByTicketId(ticketId) {
  const dbId = ticketDbIdFrom(ticketId);
  if (dbId == null) return null;
  return prisma.supportTicket.findUnique({ where: { id: dbId }, include: TICKET_INCLUDE });
}

async function listAllTickets({ status } = {}) {
  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status } : undefined,
    include: TICKET_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
  return tickets.map(toAdminTicket);
}

async function getTicketById(ticketId) {
  const ticket = await findTicketByTicketId(ticketId);
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }
  return toAdminTicket(ticket);
}

// A reply here is always from HumanCare staff — unlike the corporate side, this never
// reopens a resolved/closed ticket on its own; status changes go through
// updateTicketStatus so an admin can reply (e.g. "closing this now") without the
// ticket silently flipping back to open underneath them.
async function replyToTicket(ticketId, authorName, body) {
  const ticket = await findTicketByTicketId(ticketId);
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }
  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { messages: { create: [{ authorName, authorRole: 'admin', body }] } },
    include: TICKET_INCLUDE,
  });

  const corporateUsers = await prisma.corporateUser.findMany({ where: { corporateId: ticket.corporateId }, select: { id: true } });
  if (corporateUsers.length) {
    await prisma.notification.createMany({
      data: corporateUsers.map((u) => ({
        recipientType: 'corporate_user',
        recipientId: u.id,
        kind: 'system',
        title: `Reply on ticket ${ticketIdFor(ticket.id)}`,
        body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      })),
    });
  }

  return toAdminTicket(updated);
}

async function updateTicketStatus(ticketId, status) {
  if (!VALID_TICKET_STATUSES.includes(status)) {
    const err = new Error(`status must be one of: ${VALID_TICKET_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const ticket = await findTicketByTicketId(ticketId);
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }
  const updated = await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status }, include: TICKET_INCLUDE });
  return toAdminTicket(updated);
}

module.exports = {
  loginAdmin,
  listAdmins,
  createAdmin,
  deleteAdmin,
  listPendingRegistrations,
  getRegistrationForAdmin,
  approveRegistration,
  rejectRegistration,
  listCorporates,
  createCorporate,
  createCorporateUser,
  listAllCases,
  reassignCase,
  listBillableCases,
  updateCaseBilling,
  searchPatients,
  VALID_TICKET_STATUSES,
  listAllTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
};
