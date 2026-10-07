const { prisma } = require('../../db/prisma');

async function listAllServices() {
  return prisma.service.findMany({ orderBy: { createdAt: 'desc' } });
}

async function getServiceBySlug(slug) {
  return prisma.service.findUnique({ where: { slug } });
}

async function createServiceRecord({ slug, name, subtitle, description, provides, sortOrder }) {
  const existing = await prisma.service.findUnique({ where: { slug } });
  if (existing) {
    const err = new Error('A service with that slug already exists.');
    err.statusCode = 409;
    throw err;
  }
  return prisma.service.create({
    data: { slug, name, subtitle: subtitle || null, description: description || null, provides: provides || null, sortOrder: sortOrder || 0 },
  });
}

async function updateServiceRecord(slug, { name, subtitle, description, provides, sortOrder }) {
  const existing = await prisma.service.findUnique({ where: { slug } });
  if (!existing) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    throw err;
  }
  return prisma.service.update({
    where: { slug },
    data: {
      ...(name !== undefined && { name }),
      ...(subtitle !== undefined && { subtitle }),
      ...(description !== undefined && { description }),
      ...(provides !== undefined && { provides }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });
}

async function deleteServiceRecord(slug) {
  const existing = await prisma.service.findUnique({ where: { slug } });
  if (!existing) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    throw err;
  }
  await prisma.service.delete({ where: { slug } });
}

module.exports = { listAllServices, getServiceBySlug, createServiceRecord, updateServiceRecord, deleteServiceRecord };
