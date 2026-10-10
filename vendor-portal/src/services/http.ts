// Axios client for the Node.js/Express backend. Attaches the JWT and turns errors into ApiError.
// Only used when VITE_USE_MOCK_API=false.
import axios, { AxiosError } from 'axios';
import { API_BASE_URL, ApiError } from './config';
import { clearSession, getToken } from './session';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string; message?: string }>) => {
    const status = err.response?.status ?? 0;
    if (status === 401) {
      clearSession();
      window.dispatchEvent(new Event('hcw:unauthorized'));
    }
    const message =
      err.response?.data?.error ??
      err.response?.data?.message ??
      (status === 0 ? 'Unable to reach the server. Check your connection and try again.' : 'Something went wrong. Please try again.');
    return Promise.reject(new ApiError(message, status));
  },
);
