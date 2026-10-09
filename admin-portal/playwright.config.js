// @ts-check
const { defineConfig } = require('@playwright/test');

// admin.html has no dev server — it's a static file that talks directly to the
// backend (hardcoded to http://localhost:4000), so these tests need that backend
// already running against whichever database it's currently pointed at (there's no
// separate test-mode for this static page). They create a clearly-named test vendor
// as a side effect — safe to delete manually afterwards if desired.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
});
