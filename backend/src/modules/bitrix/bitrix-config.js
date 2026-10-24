// Master switch for sending anything to the real Bitrix24 CRM. OFF unless .env says
// exactly BITRIX_SYNC_ENABLED=true — a missing or misspelled value keeps it off, so
// nothing reaches the CRM by accident.
//
// While off, new requests/cases are simply not synced (no failure is recorded and the
// retry job does nothing), so turning it on later sends only what's created from then
// on, never a backlog from the off period.
function isBitrixSyncEnabled() {
  return process.env.BITRIX_SYNC_ENABLED === 'true';
}

module.exports = { isBitrixSyncEnabled };
