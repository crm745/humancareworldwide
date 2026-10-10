// Where the JWT session lives. "Remember me" → localStorage (30 days); otherwise sessionStorage (8 hours).
import type { Session } from '@/types';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';

const KEY = 'hcw_vendor_session';
export const SESSION_HOURS = 8;
export const REMEMBER_DAYS = 30;

export function getSession(): Session | null {
  const s = readJSON<Session | null>(KEY, null, 'local') ?? readJSON<Session | null>(KEY, null, 'session');
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    clearSession();
    return null;
  }
  return s;
}

export function saveSession(session: Session, remember: boolean): void {
  clearSession();
  writeJSON(KEY, session, remember ? 'local' : 'session');
}

export function updateSessionUser(user: Session['user']): void {
  const inLocal = readJSON<Session | null>(KEY, null, 'local');
  const area = inLocal ? 'local' : 'session';
  const s = inLocal ?? readJSON<Session | null>(KEY, null, 'session');
  if (s) writeJSON(KEY, { ...s, user }, area);
}

export function clearSession(): void {
  removeKey(KEY, 'local');
  removeKey(KEY, 'session');
}

export const getToken = (): string | null => getSession()?.token ?? null;
