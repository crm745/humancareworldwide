// Unit tests for the Bitrix24 webhook wrapper itself (not the requests/cases flows
// that call it — those already mock this module out, see requests.test.js). This
// file exists specifically to cover the response-handling bug fixed here: a
// malformed/ambiguous response from Bitrix used to be silently treated as success.

const ORIGINAL_ENV = process.env.BITRIX24_WEBHOOK_URL;
const ORIGINAL_FETCH = global.fetch;

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe('bitrix.service#createLead', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BITRIX24_WEBHOOK_URL = 'https://example.bitrix24.com/rest/1/testtoken/';
    process.env.BITRIX_SYNC_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.BITRIX24_WEBHOOK_URL = ORIGINAL_ENV;
    delete process.env.BITRIX_SYNC_ENABLED;
    global.fetch = ORIGINAL_FETCH;
  });

  const call = () => {
    const { createLead } = require('../src/modules/bitrix/bitrix.service');
    return createLead({ name: 'Rakesh Sharma', mobile: '9876543210', email: 'a@b.com', serviceType: 'Air Ambulance', origin: 'Mumbai', destination: 'Dubai', referenceNumber: 'REQ-1' });
  };

  it('returns the lead id on a normal successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { result: 42 }));
    await expect(call()).resolves.toBe(42);
  });

  it.each([undefined, 'false', 'TRUE', '1'])('sends nothing while the switch is %s', async (value) => {
    if (value === undefined) delete process.env.BITRIX_SYNC_ENABLED;
    else process.env.BITRIX_SYNC_ENABLED = value;
    global.fetch = jest.fn();
    await expect(call()).rejects.toThrow(/switched off/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws without calling fetch when the webhook URL is not configured', async () => {
    delete process.env.BITRIX24_WEBHOOK_URL;
    global.fetch = jest.fn();
    await expect(call()).rejects.toThrow('BITRIX24_WEBHOOK_URL is not set');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws on a non-2xx response even when the body has no `error` key (the bug this fixes)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(429, { someOtherField: 'rate limited' }));
    await expect(call()).rejects.toThrow(/HTTP 429/);
  });

  it('throws on a non-2xx response with a non-JSON body instead of masking it as a parse error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new Error('Unexpected token <')) });
    await expect(call()).rejects.toThrow(/HTTP 502/);
  });

  it('throws on a 2xx response with no `result` field instead of silently returning undefined', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    await expect(call()).rejects.toThrow(/returned no result/);
  });

  it('throws Bitrix\'s own error message on a well-formed error response', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { error: 'INVALID_FIELD', error_description: 'TITLE is required' }));
    await expect(call()).rejects.toThrow(/TITLE is required/);
  });

  it('aborts and throws a timeout error if Bitrix never responds', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));

    const promise = call();
    const assertion = expect(promise).rejects.toThrow(/timed out/);
    await jest.advanceTimersByTimeAsync(15000);
    await assertion;
    jest.useRealTimers();
  });
});
