// One-time script to create the first admin account for local testing.
// Run with: node src/seed-admin.js
const bcrypt = require('bcryptjs');
const { prisma } = require('./db/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('TestAdmin@2026', 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@humancareworldwide.com' },
    update: {},
    create: {
      name: 'HumanCare Admin',
      email: 'admin@humancareworldwide.com',
      passwordHash,
    },
  });

  console.log('Admin login created:', { email: admin.email, password: 'TestAdmin@2026' });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
