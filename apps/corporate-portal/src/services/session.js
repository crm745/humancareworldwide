import { readJSON, removeKey, writeJSON } from '@/utils/storage';

const KEY = 'hcw_corporate_session';
export const SESSION_HOURS = 8;
export const REMEMBER_DAYS = 30;

export function getSession() {
  const s = readJSON(KEY, null, 'local') ?? readJSON(KEY, null, 'session');
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    clearSession();
    return null;
  }
  return s;
}

export function saveSession(session, remember) {
  clearSession();
  writeJSON(KEY, session, remember ? 'local' : 'session');
}

export function updateSessionUser(user) {
  const inLocal = readJSON(KEY, null, 'local');
  const area = inLocal ? 'local' : 'session';
  const s = inLocal ?? readJSON(KEY, null, 'session');
  if (s) writeJSON(KEY, { ...s, user }, area);
}

// Swaps in a freshly-refreshed access/refresh token pair without disturbing which
// storage area (local vs session — i.e. "remember me") the session already lives in.
// Used by http.js when the 15-minute access token expires mid-session.
export function updateSessionTokens(token, refreshToken) {
  const inLocal = readJSON(KEY, null, 'local');
  const area = inLocal ? 'local' : 'session';
  const s = inLocal ?? readJSON(KEY, null, 'session');
  if (s) writeJSON(KEY, { ...s, token, refreshToken }, area);
}

export function clearSession() {
  removeKey(KEY, 'local');
  removeKey(KEY, 'session');
}

export const getToken = () => getSession()?.token ?? null;
export const getRefreshToken = () => getSession()?.refreshToken ?? null;
