// Safe JSON wrappers around local/session storage (private mode or blocked storage must not crash the app).

type Area = 'local' | 'session';
const areaOf = (area: Area): Storage | null => {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export function readJSON<T>(key: string, fallback: T, area: Area = 'local'): T {
  try {
    const raw = areaOf(area)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, area: Area = 'local'): void {
  try {
    areaOf(area)?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: the app keeps working in memory */
  }
}

export function removeKey(key: string, area: Area = 'local'): void {
  try {
    areaOf(area)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
