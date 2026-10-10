import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, SessionUser } from '@/types';
import { authService } from '@/services/authService';
import { getSession, updateSessionUser } from '@/services/session';

interface AuthContextValue {
  session: Session | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, remember: boolean) => Promise<Session>;
  logout: () => void;
  updateUser: (patch: Partial<SessionUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());

  // The HTTP client fires this on a 401 so every tab drops to the login page.
  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener('hcw:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hcw:unauthorized', onUnauthorized);
  }, []);

  // Expire the session on its deadline even if the tab stays open.
  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt - Date.now();
    const t = setTimeout(() => {
      authService.logout();
      setSession(null);
    }, Math.min(Math.max(ms, 0), 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [session]);

  const login = useCallback(async (identifier: string, password: string, remember: boolean) => {
    const s = await authService.login(identifier, password, remember);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const updateUser = useCallback((patch: Partial<SessionUser>) => {
    setSession((s) => {
      if (!s) return s;
      const user = { ...s.user, ...patch };
      updateSessionUser(user);
      return { ...s, user };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, isAuthenticated: !!session, login, logout, updateUser }),
    [session, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
