// Runtime switches (see .env.example). With no .env the portal runs fully on the mock API.
export const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? 'true') !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/** Simulated network latency for the mock API, so loading states are visible. */
export const mockDelay = (min = 350, spread = 350) => new Promise((resolve) => setTimeout(resolve, min + Math.random() * spread));

export class ApiError extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
