import { Platform } from 'react-native';

// Hands the one-time step ticket (and the masked contact etc.) from one auth screen to
// the next without putting it in route params — on web those show up in the address
// bar and browser history. Each screen has its own slot, so Back to an earlier step
// still finds that step's data.
//
// Native keeps it in memory (an app screen doesn't "refresh"). Web also mirrors it to
// sessionStorage so a refresh mid-flow stays on the same step; that storage belongs to
// the one tab and is gone when it closes. Tickets expire server-side after 15 minutes.
const KEY = 'humancare_auth_steps';
const isWeb = Platform.OS === 'web';
let memory = {};

function readWeb() {
  try { return JSON.parse(window.sessionStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function writeWeb(value) {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage blocked: memory still works */ }
}

// What a code screen needs from the backend's step-1 answer: the ticket, the masked
// contact to show, and — when the backend uses Firebase for this mobile — the full
// number the app must ask Firebase to text (see usePhoneCode).
export function codeStepFrom(data, extra = {}) {
  return {
    ticket: data.ticket,
    contact: data.maskedContact,
    phoneVerification: data.phoneVerification,
    phoneNumber: data.phoneNumber,
    ...extra,
  };
}

export function setAuthStep(screen, data) {
  memory = { ...(isWeb ? readWeb() : memory), [screen]: data };
  if (isWeb) writeWeb(memory);
}

export function getAuthStep(screen) {
  return (isWeb ? readWeb() : memory)[screen] || null;
}

// Once signed in (or the flow is finished) none of the tickets are needed any more.
export function clearAuthSteps() {
  memory = {};
  if (isWeb) {
    try { window.sessionStorage.removeItem(KEY); } catch { /* nothing stored */ }
  }
}
