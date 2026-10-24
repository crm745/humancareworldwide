const { toUiStatus, formatDisplayDate, serviceKeyFromTitle, toListItem } = require('../requestShape');

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
