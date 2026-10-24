export function isValidName(value) {
  const v = (value || '').trim();
  return v.length >= 2 && /\p{L}/u.test(v);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
}

// Fallback for countries isValidPhoneForCountry doesn't have an exact length for — a
// loose sanity range covering real numbers worldwide, not any one country's exact length.
export function isValidPhone(value) {
  const len = (value || '').replace(/\D/g, '').length;
  return len >= 7 && len <= 15;
}

// Mobile number length (national significant number, i.e. not counting the country
// code) for each country this app's country-code selectors offer. Digit counts
// genuinely differ by country — confirmed against HumanCare's own real regional
// numbers (see REGIONAL_NUMBERS in data/mock.js) for the 5 countries we actually
// operate in, not just assumed from general convention.
const PHONE_LENGTH_BY_CC = {
  '+91': 10, // India
  '+971': 9, // UAE
  '+968': 8, // Oman
  '+880': 10, // Bangladesh
  '+44': 10, // UK
  '+1': 10, // US/Canada
};

export function isValidPhoneForCountry(value, countryCode) {
  const len = (value || '').replace(/\D/g, '').length;
  const expected = PHONE_LENGTH_BY_CC[countryCode];
  return expected ? len === expected : isValidPhone(value);
}

export function isValidDateString(value) {
  const v = (value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

// Age is optional everywhere it's used, so empty is valid — only checked if filled in.
export function isValidAge(value) {
  if (!value) return true;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 130;
}
