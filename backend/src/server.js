require('dotenv').config();
const { app } = require('./app');
const { retryFailedBitrixSyncs } = require('./modules/bitrix/bitrix-retry.service');

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
}
