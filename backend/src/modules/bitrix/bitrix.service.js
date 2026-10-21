// Thin wrapper around HumanCare's Bitrix24 inbound webhook (CRM scope).
// BITRIX24_WEBHOOK_URL lives in .env — never hardcode it here.
//
// Every call is fire-and-forget from the caller's point of view: a Bitrix24
// outage must never block a patient's request from being saved in our own
// database. Callers should wrap these in try/catch and log-and-continue.

const WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL;
const REQUEST_TIMEOUT_MS = 15000; // Bitrix webhooks normally respond in well under a second.

async function callBitrix(method, payload) {
  if (!WEBHOOK_URL) {
    throw new Error('BITRIX24_WEBHOOK_URL is not set');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(WEBHOOK_URL + method + '.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Bitrix24 ${method} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  // Bitrix always answers with JSON on success; a non-2xx (rate limit, auth failure,
  // a proxy error page) may not — parse defensively so a non-JSON body doesn't throw
  // here and mask the real `!res.ok` failure below with a generic parse error instead.
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Bitrix24 ${method} failed (HTTP ${res.status}): ${data.error_description || data.error || 'no error details in response'}`);
  }
  // A 2xx with no `result` is just as ambiguous as an error — treat it as a failure
  // instead of letting `undefined` flow back to the caller and get silently dropped
  // by Prisma's update (which ignores undefined fields), leaving a lead that looks
  // neither successful nor recorded as failed anywhere.
  if (data.result === undefined || data.result === null) {
    throw new Error(`Bitrix24 ${method} returned no result`);
  }
  return data.result;
}

// Creates a Lead in Bitrix24 for a newly-submitted patient request.
// Returns the numeric Bitrix24 lead id (store it as ServiceRequest.bitrixLeadId).
async function createLead({ name, mobile, email, serviceType, origin, destination, referenceNumber }) {
  const fields = {
    TITLE: `${serviceType} — ${referenceNumber}`,
    NAME: name,
    PHONE: mobile ? [{ VALUE: mobile, VALUE_TYPE: 'WORK' }] : undefined,
    EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
    COMMENTS: `Origin: ${origin || '—'}\nDestination: ${destination || '—'}\nReference: ${referenceNumber}`,
    // "Other" in this Bitrix24 account's own Source list — confirmed via a live
    // crm.status.list(SOURCE) lookup, not Bitrix's generic default code, since this
    // account's source list is fully custom. Revisit once dedicated sources exist
    // for mobile-app and corporate-portal leads (see bitrix.service.js discussion).
    SOURCE_ID: 'UC_8HLHOF',
  };
  return callBitrix('crm.lead.add', { fields });
}

module.exports = { createLead };
