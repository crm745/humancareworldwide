// One-time script to create a test vendor account for local testing.
// Run with: node src/seed-vendor.js
const bcrypt = require('bcryptjs');
const { prisma } = require('./db/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('TestVendor@2026', 10);

  const vendor = await prisma.vendor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyName: 'Meridian Global Assistance',
      type: 'tpa',
    },
  });

  const vendorUser = await prisma.vendorUser.upsert({
    where: { email: 'ops@meridianglobal.com' },
    update: {},
    create: {
      vendorId: vendor.id,
      email: 'ops@meridianglobal.com',
      passwordHash,
      role: 'admin',
    },
  });

  console.log('Vendor created:', vendor);
  console.log('Vendor login created:', { email: vendorUser.email, password: 'TestVendor@2026' });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
