import { readJSON, removeKey, writeJSON } from '@/utils/storage';

const KEY = 'hcw_vendor_session';
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

export function clearSession() {
  removeKey(KEY, 'local');
  removeKey(KEY, 'session');
}

export const getToken = () => getSession()?.token ?? null;
