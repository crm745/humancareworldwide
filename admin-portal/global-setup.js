// Logs in once for the whole test run and saves the session cookie to disk, instead
// of every test logging in separately. Two reasons: it's faster, and real logins now
// go through the same brute-force rate limiter as production (5 per 15 min per IP,
// see backend/src/middleware/rate-limit.middleware.js) — a suite that logs in per
// test would trip that limit on its own and start failing partway through.
const { request } = require('@playwright/test');

const ADMIN_EMAIL = 'admin@humancareworldwide.com';
const ADMIN_PASSWORD = 'TestAdmin@2026'; // seeded by backend/src/seed-admin.js

module.exports = async () => {
  const ctx = await request.newContext();
  const res = await ctx.post('http://localhost:4000/admin/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`Global admin login failed (${res.status()}): ${await res.text()}`);
  }
  await ctx.storageState({ path: 'tests/.admin-auth.json' });
  await ctx.dispose();
};
