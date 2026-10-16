// One-time script to create a test corporate account for local testing.
// Run with: node src/seed-corporate.js
const bcrypt = require('bcryptjs');
const { prisma } = require('./db/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('TestCorporate@2026', 10);

  const corporate = await prisma.corporate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      companyName: 'Meridian Global Assistance',
      type: 'tpa',
    },
  });

  const corporateUser = await prisma.corporateUser.upsert({
    where: { email: 'ops@meridianglobal.com' },
    update: {},
    create: {
      corporateId: corporate.id,
      email: 'ops@meridianglobal.com',
      passwordHash,
      role: 'admin',
    },
  });

  console.log('Corporate created:', corporate);
  console.log('Corporate login created:', { email: corporateUser.email, password: 'TestCorporate@2026' });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
