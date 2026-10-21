// Runtime switches (see .env.example). With no .env the portal talks to the real
// backend — mock mode is an explicit opt-in for frontend-only work, never the
// default, so a fresh checkout/deploy can't silently end up running on fake data.
export const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API ?? 'false') === 'true';
// No `/api` prefix — the backend mounts its routers directly at e.g. `/corporate/cases`,
// not `/api/corporate/cases` (see backend/src/app.js).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

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
