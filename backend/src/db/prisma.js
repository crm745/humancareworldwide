const { PrismaClient } = require('@prisma/client');

// Patient password hashes are left out of every query by default, so no endpoint can
// leak one by returning a whole user row. Auth code that needs it opts back in with
// `omit: { passwordHash: false }`.
const prisma = new PrismaClient({ omit: { user: { passwordHash: true } } });

module.exports = { prisma };
