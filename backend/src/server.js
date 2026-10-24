require('dotenv').config();
const { app } = require('./app');
const { retryFailedBitrixSyncs } = require('./modules/bitrix/bitrix-retry.service');
const { purgeOldSecurityEvents, retentionDays } = require('./modules/auth/security-events');

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`HumanCare backend listening on http://localhost:${port}`);
});

// Picks up leads that failed to sync to Bitrix24 on submission and retries them in
// the background — see bitrix-retry.service.js. Skipped during tests, which never
// run long enough for this to fire and shouldn't make real outbound Bitrix calls.
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    retryFailedBitrixSyncs().catch((err) => console.error('Bitrix24 retry sweep failed:', err.message));
  }, 5 * 60 * 1000);

  // Deletes security log entries past their retention period — once at startup, then
  // daily. See security-events.js.
  const purgeSecurityLog = () => purgeOldSecurityEvents()
    .then((count) => { if (count) console.log(`Deleted ${count} security log entries older than ${retentionDays()} days.`); })
    .catch((err) => console.error('Security log cleanup failed:', err.message));
  purgeSecurityLog();
  setInterval(purgeSecurityLog, 24 * 60 * 60 * 1000);
}
