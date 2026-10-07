export function isValidName(value) {
  const v = (value || '').trim();
  return v.length >= 2 && /\p{L}/u.test(v);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
}

// Used only where there's no country context (e.g. login's free-text "mobile or
// email" field, which has no country-code selector next to it) — a loose sanity
// range covering real numbers worldwide, not any one country's exact length.
export function isValidPhone(value) {
  const len = (value || '').replace(/\D/g, '').length;
  return len >= 7 && len <= 15;
}

// Mobile number length (national significant number, i.e. not counting the country
// code) for each country this app's country-code selectors offer. Digit counts
// genuinely differ by country — India and the UK and US/Canada are 10, the UAE is 9 —
// so a single "10 digits" rule was wrong for 1 of our 4 supported countries.
const PHONE_LENGTH_BY_CC = {
  '+91': 10, // India
  '+971': 9, // UAE
  '+44': 10, // UK
  '+1': 10, // US/Canada
};

export function isValidPhoneForCountry(value, countryCode) {
  const len = (value || '').replace(/\D/g, '').length;
  const expected = PHONE_LENGTH_BY_CC[countryCode];
  return expected ? len === expected : isValidPhone(value);
}

// Login's "mobile or email" field — valid email format if it looks like one,
// otherwise needs to look like a real phone number.
export function isValidLoginIdentifier(value) {
  const v = (value || '').trim();
  if (!v) return false;
  return v.includes('@') ? isValidEmail(v) : isValidPhone(v);
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
