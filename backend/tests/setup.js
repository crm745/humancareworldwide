// Runs before the test framework loads. Points every test at the dedicated
// `humancare_test` database instead of the real dev database — see .env.test
// (gitignored, same as .env), created via MySQL GRANT on 2026-10-09.
require('dotenv').config({ path: '.env.test', override: true });

// The Prisma client loads the real dev .env whenever it's first required — including in
// the jest parent process (tests/global-setup.js), whose environment every test file
// inherits. So a setting that .env.test doesn't mention (e.g. PHONE_OTP_PROVIDER,
// SMTP_USER/SMTP_PASS, FIREBASE_SERVICE_ACCOUNT_PATH) would leak in and switch the tests
// to real providers. Blank out every dev-only key; an empty value also counts as
// "already set", so Prisma won't fill it in again.
{
  const fs = require('fs');
  const path = require('path');
  const dotenv = require('dotenv');
  const read = (file) => (fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {});
  const testKeys = new Set(Object.keys(read(path.join(__dirname, '..', '.env.test'))));
  for (const key of Object.keys(read(path.join(__dirname, '..', '.env')))) {
    if (!testKeys.has(key)) process.env[key] = '';
  }
}

// Tests must never create leads in the real Bitrix24 CRM. .env.test can hold the live
// webhook URL, and several suites (cases, corporate flows) run code that syncs to
// Bitrix without mocking it — so drop the URL (bitrix.service then fails fast with
// "not set", which callers already treat as a best-effort sync failure) and refuse
// any request to a Bitrix host as a second line of defence. bitrix.service.test.js
// sets its own fake URL and mocks fetch itself, so it is unaffected.
delete process.env.BITRIX24_WEBHOOK_URL;
const realFetch = global.fetch;
global.fetch = (url, ...rest) => {
  if (/bitrix24\./i.test(String(url))) {
    return Promise.reject(new Error(`Blocked Bitrix24 call during tests: ${String(url).split('/rest/')[0]}`));
  }
  return realFetch(url, ...rest);
};
