// Thin wrapper around HumanCare's Bitrix24 inbound webhook (CRM scope).
// BITRIX24_WEBHOOK_URL lives in .env — never hardcode it here.
//
// Every call is fire-and-forget from the caller's point of view: a Bitrix24
// outage must never block a patient's request from being saved in our own
// database. Callers should wrap these in try/catch and log-and-continue.

const WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL;

async function callBitrix(method, payload) {
  if (!WEBHOOK_URL) {
    throw new Error('BITRIX24_WEBHOOK_URL is not set');
  }
  const res = await fetch(WEBHOOK_URL + method + '.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Bitrix24 ${method} failed: ${data.error_description || data.error}`);
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
    SOURCE_ID: 'WEB', // TODO: confirm the right Lead Source ID with whoever manages Bitrix24
  };
  return callBitrix('crm.lead.add', { fields });
}

module.exports = { createLead };
