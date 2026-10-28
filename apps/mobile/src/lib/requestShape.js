import SERVICES from '../data/services.json';

// Backend uses 'in_progress'; the UI (Pill, filters, i18n keys) uses 'progress'.
const STATUS_TO_UI = { submitted: 'submitted', in_progress: 'progress', completed: 'completed', cancelled: 'cancelled' };
const TITLE_TO_KEY = Object.fromEntries(Object.entries(SERVICES).map(([key, s]) => [s.title, key]));

// Mortal Remains requests name the deceased, not a patient ("mortal" from older builds,
// "mortal_domestic" / "mortal_international" now).
export const isMortalRequest = (request) => /^mortal(_|$)/.test(request?.serviceKey || '');

export function toUiStatus(backendStatus) {
  return STATUS_TO_UI[backendStatus] || backendStatus;
}

export function serviceKeyFromTitle(title) {
  return TITLE_TO_KEY[title] || 'air';
}

export function formatDisplayDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Shapes one backend ServiceRequest into what the My Requests list / filters expect.
export function toListItem(request) {
  return {
    id: request.referenceNumber,
    rawId: request.id,
    service: serviceKeyFromTitle(request.serviceType),
    status: toUiStatus(request.status),
    date: (request.createdAt || '').slice(0, 10),
    display: formatDisplayDate(request.createdAt),
  };
}
