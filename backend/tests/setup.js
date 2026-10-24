// Runs before the test framework loads. Points every test at the dedicated
// `humancare_test` database instead of the real dev database — see .env.test
// (gitignored, same as .env), created via MySQL GRANT on 2026-10-09.
require('dotenv').config({ path: '.env.test', override: true });

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
