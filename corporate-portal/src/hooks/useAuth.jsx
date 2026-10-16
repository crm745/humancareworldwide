import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '@/services/authService';
import { getSession, updateSessionUser } from '@/services/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

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
    const t = setTimeout(
      () => {
        authService.logout();
        setSession(null);
      },
      Math.min(Math.max(ms, 0), 2 ** 31 - 1),
    );
    return () => clearTimeout(t);
  }, [session]);

  const login = useCallback(async (identifier, password, remember) => {
    const s = await authService.login(identifier, password, remember);
    // The real backend's login only confirms the password and sends an OTP — that's
    // not a signed-in session yet, so don't treat it as one. See authService.login().
    if (!s.otpRequired) setSession(s);
    return s;
  }, []);

  const verifyOtp = useCallback(async (identifier, code, remember) => {
    const s = await authService.verifyOtp(identifier, code, remember);
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setSession((s) => {
      if (!s) return s;
      const user = { ...s.user, ...patch };
      updateSessionUser(user);
      return { ...s, user };
    });
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, isAuthenticated: !!session, login, verifyOtp, logout, updateUser }),
    [session, login, verifyOtp, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
