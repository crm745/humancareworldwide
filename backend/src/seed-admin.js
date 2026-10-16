// One-time script to create the first admin account for local testing.
// Run with: node src/seed-admin.js
// Set INITIAL_ADMIN_PASSWORD in .env to pick the password yourself — otherwise a
// fresh random one is generated and printed below. Never hardcode a password here;
// this file (and its history) ends up in Git.
const bcrypt = require('bcryptjs');
const { prisma } = require('./db/prisma');
const { randomPassword } = require('./lib/random-password');

async function main() {
  const email = 'admin@humancareworldwide.com';
  // A plain upsert with an empty `update` would silently skip re-hashing on a
  // second run, but we'd still print the newly-generated password as if it had
  // been saved — so re-running against an existing admin is a no-op instead.
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin login already exists, password unchanged:', { email });
    return;
  }

  const password = process.env.INITIAL_ADMIN_PASSWORD || randomPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.adminUser.create({
    data: { name: 'HumanCare Admin', email, passwordHash },
  });

  console.log('Admin login created:', { email: admin.email, password });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
