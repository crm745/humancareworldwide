import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './session';
import { navReplace } from './nav';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// De-dupes concurrent refresh attempts: if three requests all hit an expired access
// token at once, only one actual /auth/refresh call goes out; the other two just wait
// on the same promise instead of racing each other.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('Not logged in');
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Session expired');
      await saveTokens({ token: data.token, refreshToken: data.refreshToken });
      return data.token;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function apiFetch(path, options = {}, isRetry = false) {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Only an expired *access* token should trigger a silent refresh — `token` being
  // set means this was actually an authenticated call, not a login attempt that
  // failed for its own reason (wrong password/OTP), which also returns 401.
  if (res.status === 401 && token && !isRetry) {
    try {
      await refreshAccessToken();
      return apiFetch(path, options, true);
    } catch {
      await clearTokens();
      navReplace('/welcome');
      throw new Error('Your session expired. Please log in again.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export function apiGet(path) {
  return apiFetch(path);
}

export function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch(path, body) {
  return apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
}

// File uploads go through FormData, which needs its own multipart boundary in the
// Content-Type header — fetch sets that automatically, but only if we don't also set
// 'Content-Type': 'application/json' like apiFetch does for everything else.
export async function apiUpload(path, file, isRetry = false) {
  const token = await getAccessToken();
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401 && token && !isRetry) {
    try {
      await refreshAccessToken();
      return apiUpload(path, file, true);
    } catch {
      await clearTokens();
      navReplace('/welcome');
      throw new Error('Your session expired. Please log in again.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed. Please try again.');
  return data;
}
