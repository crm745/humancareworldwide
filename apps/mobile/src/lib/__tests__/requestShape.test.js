const { toUiStatus, formatDisplayDate, serviceKeyFromTitle, toListItem, isMortalRequest } = require('../requestShape');
const { requestService } = require('../../data/mock');

describe('toUiStatus', () => {
  it('maps in_progress to progress', () => expect(toUiStatus('in_progress')).toBe('progress'));
  it('passes through an already-UI status unchanged', () => expect(toUiStatus('completed')).toBe('completed'));
  it('passes through an unknown status unchanged', () => expect(toUiStatus('weird_status')).toBe('weird_status'));
});

describe('formatDisplayDate', () => {
  it('formats an ISO date as DD Mon YYYY', () => {
    expect(formatDisplayDate('2026-09-25T00:00:00.000Z')).toMatch(/25 Sep\w* 2026/);
  });
  it('returns empty string for a missing date', () => expect(formatDisplayDate(null)).toBe(''));
});

describe('serviceKeyFromTitle', () => {
  it('falls back to "air" for an unrecognized title', () => {
    expect(serviceKeyFromTitle('Some Made Up Service')).toBe('air');
  });
});

describe('toListItem', () => {
  it('shapes a backend ServiceRequest into a list item', () => {
    const item = toListItem({
      id: 7,
      referenceNumber: 'REQ-1007',
      serviceType: 'Not A Real Service',
      status: 'in_progress',
      createdAt: '2026-09-25T00:00:00.000Z',
    });
    expect(item).toMatchObject({ id: 'REQ-1007', rawId: 7, status: 'progress', date: '2026-09-25' });
  });
});

describe('Mortal Remains requests', () => {
  const services = { mortal: { title: 'Mortal Remains Transportation' }, air: { title: 'Air Ambulance' } };
  it('names the transfer type and sends its own service key', () => {
    expect(requestService({ service: 'mortal', mortalTransfer: 'international' }, services))
      .toEqual({ title: 'Mortal Remains Transportation — International', key: 'mortal_international' });
    expect(requestService({ service: 'mortal', mortalTransfer: 'domestic' }, services).key).toBe('mortal_domestic');
  });
  it('recognises old and new Mortal Remains requests', () => {
    expect(isMortalRequest({ serviceKey: 'mortal' })).toBe(true);
    expect(isMortalRequest({ serviceKey: 'mortal_domestic' })).toBe(true);
    expect(isMortalRequest({ serviceKey: 'ground' })).toBe(false);
    expect(isMortalRequest({})).toBe(false);
  });
});
