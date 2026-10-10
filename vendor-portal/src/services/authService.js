import { sha256 } from '@/utils/crypto';
import { ApiError, USE_MOCK_API, mockDelay } from './config';
import { http } from './http';
import { REMEMBER_DAYS, SESSION_HOURS, clearSession, getSession, saveSession } from './session';
import { listUsers, saveUsers } from './registrationStore';

/**
 * Sample account that exists ONLY in mock mode so the portal can be explored without registering.
 * It is not a real credential and is never used when VITE_USE_MOCK_API=false.
 */
export const MOCK_DEMO_ACCOUNT = { username: 'demo.vendor', password: 'Demo@2026' };

async function ensureDemoUser() {
  const users = listUsers();
  if (users.some((u) => u.username === MOCK_DEMO_ACCOUNT.username)) return;
  users.push({
    vendorId: 'HCW-VND-00125',
    username: MOCK_DEMO_ACCOUNT.username,
    email: 'ananya.mehta@medicorpglobal.com',
    passwordHash: await sha256(MOCK_DEMO_ACCOUNT.password),
    companyName: 'MediCorp Global Assistance Pvt. Ltd.',
    contactName: 'Ananya Mehta',
  });
  saveUsers(users);
}

const toUser = (u) => ({
  vendorId: u.vendorId,
  username: u.username,
  email: u.email,
  companyName: u.companyName,
  contactName: u.contactName,
});

const findUser = (identifier) => {
  const id = identifier.trim().toLowerCase();
  return listUsers().find((u) => u.username === id || u.email.toLowerCase() === id);
};

// Simple client-side throttle in mock mode; the real API rate-limits on the server.
let failedAttempts = 0;
let lockedUntil = 0;

export const authService = {
  async login(identifier, password, remember) {
    if (!USE_MOCK_API) {
      const { data } = await http.post('/auth/vendor/login', { identifier, password });
      const session = { token: data.token, user: data.user, expiresAt: Date.now() + data.expiresIn * 1000 };
      saveSession(session, remember);
      return session;
    }
    await ensureDemoUser();
    await mockDelay(600, 400);
    if (Date.now() < lockedUntil) {
      throw new ApiError(`Too many failed attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)} seconds.`, 429);
    }
    const user = findUser(identifier);
    const ok = user && user.passwordHash === (await sha256(password));
    if (!user || !ok) {
      failedAttempts += 1;
      if (failedAttempts >= 5) {
        lockedUntil = Date.now() + 30000;
        failedAttempts = 0;
      }
      throw new ApiError('Invalid username or password.', 401);
    }
    failedAttempts = 0;
    const ttl = remember ? REMEMBER_DAYS * 86400000 : SESSION_HOURS * 3600000;
    const session = {
      // Opaque mock token; the real API issues a signed JWT.
      token: `mock.${btoa(user.vendorId)}.${Date.now().toString(36)}`,
      user: toUser(user),
      expiresAt: Date.now() + ttl,
    };
    saveSession(session, remember);
    return session;
  },

  logout() {
    if (!USE_MOCK_API) http.post('/auth/vendor/logout').catch(() => undefined);
    clearSession();
  },

  /** Always resolves, so the response never reveals whether an email is registered. */
  async forgotPassword(email) {
    if (!USE_MOCK_API) {
      await http.post('/auth/vendor/forgot-password', { email });
      return {};
    }
    await ensureDemoUser();
    await mockDelay(700);
    const user = findUser(email);
    // Mock only: hand the token back so the demo can open the reset page without real email.
    return { resetToken: user ? btoa(`${user.username}:${Date.now()}`) : undefined };
  },

  async resetPassword(token, password) {
    if (!USE_MOCK_API) {
      await http.post('/auth/vendor/reset-password', { token, password });
      return;
    }
    await mockDelay(700);
    let username = '';
    let issuedAt = 0;
    try {
      const [u, t] = atob(token).split(':');
      username = u;
      issuedAt = Number(t);
    } catch {
      /* invalid token */
    }
    const users = listUsers();
    const user = users.find((u) => u.username === username);
    if (!user || !issuedAt || Date.now() - issuedAt > 3600000) throw new ApiError('This reset link is invalid or has expired.', 400);
    user.passwordHash = await sha256(password);
    saveUsers(users);
  },

  async changePassword(currentPassword, newPassword) {
    if (!USE_MOCK_API) {
      await http.post('/auth/vendor/change-password', { currentPassword, newPassword });
      return;
    }
    await ensureDemoUser();
    await mockDelay(700);
    const session = getSession();
    const users = listUsers();
    const user = users.find((u) => u.username === session?.user.username);
    if (!user) throw new ApiError('Your session has expired. Please sign in again.', 401);
    if (user.passwordHash !== (await sha256(currentPassword))) throw new ApiError('Current password is incorrect.', 400);
    if (currentPassword === newPassword) throw new ApiError('New password must be different from the current password.', 400);
    user.passwordHash = await sha256(newPassword);
    saveUsers(users);
  },
};
