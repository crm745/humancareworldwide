// @ts-check
const { defineConfig } = require('@playwright/test');

// admin.html talks directly to the backend (hardcoded to http://localhost:4000), so
// these tests need that backend already running against whichever database it's
// currently pointed at (there's no separate test-mode for this static page). They
// create a clearly-named test corporate as a side effect — safe to delete manually
// afterwards if desired.
//
// admin.html itself is served over http(s) here, not opened via file:// — the admin
// session lives in a cookie now, and browsers won't set/send cookies for file://.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: require.resolve('./global-setup.js'),
  // Every test starts already logged in (see global-setup.js) — the `login`
  // describe block overrides this back to a clean/logged-out state per test, since
  // those specifically exercise the login form itself.
  use: {
    storageState: 'tests/.admin-auth.json',
  },
  webServer: {
    command: 'node serve.js',
    url: 'http://localhost:3000/admin.html',
    reuseExistingServer: true,
  },
});
