// Runs before the test framework loads. Points every test at the dedicated
// `humancare_test` database instead of the real dev database — see .env.test
// (gitignored, same as .env), created via MySQL GRANT on 2026-10-09.
require('dotenv').config({ path: '.env.test', override: true });
