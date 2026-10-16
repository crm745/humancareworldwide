// Safe JSON wrappers around local/session storage (private mode or blocked storage must not crash the app).

const areaOf = (area) => {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export function readJSON(key, fallback, area = 'local') {
  try {
    const raw = areaOf(area)?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value, area = 'local') {
  try {
    areaOf(area)?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: the app keeps working in memory */
  }
}

export function removeKey(key, area = 'local') {
  try {
    areaOf(area)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
