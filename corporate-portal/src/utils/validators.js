export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Udyam Registration Number (current MSME format, replaced the older UAM number in 2020).
export const UAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
export const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{2,28})[a-z0-9]$/;
export const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;

export const digitsOnly = (s) => s.replace(/\D/g, '');

/** Phone check: India uses exact lengths, everyone else 7–15 digits (E.164 max). */
export function isValidPhone(value, country, kind = 'office') {
  if (!/^[+\d\s()-]+$/.test(value)) return false;
  let d = digitsOnly(value);
  if (country === 'IN') {
    if (d.startsWith('91') && d.length > 10) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    return kind === 'mobile' ? /^[6-9]\d{9}$/.test(d) : /^\d{10}$/.test(d);
  }
  return d.length >= 7 && d.length <= 15;
}

/** Postal / ZIP codes by country. UAE / Qatar have no postal codes, so the field is optional there. */
export function pincodeRule(country) {
  switch (country) {
    case 'IN':
      return { required: true, test: (v) => /^[1-9]\d{5}$/.test(v), hint: '6-digit PIN code', placeholder: 'e.g. 400076' };
    case 'US':
      return { required: true, test: (v) => /^\d{5}(-\d{4})?$/.test(v), hint: '5-digit ZIP code, e.g. 10001 or 10001-1234', placeholder: 'e.g. 10001' };
    case 'GB':
      return { required: true, test: (v) => /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(v), hint: 'UK postcode, e.g. SW1A 1AA', placeholder: 'e.g. SW1A 1AA' };
    case 'SA':
      return { required: true, test: (v) => /^\d{5}(-\d{4})?$/.test(v), hint: '5-digit postal code', placeholder: 'e.g. 12211' };
    case 'OM':
      return { required: true, test: (v) => /^\d{3}$/.test(v), hint: '3-digit postal code', placeholder: 'e.g. 112' };
    case 'AE':
    case 'QA':
      return { required: false, test: (v) => /^[A-Z0-9 -]{0,10}$/i.test(v), hint: 'Optional — no postal codes in this country', placeholder: 'Not required' };
    default:
      return { required: false, test: (v) => /^[A-Z0-9 -]{3,10}$/i.test(v), hint: 'Postal / ZIP code, if applicable', placeholder: 'Postal / ZIP code' };
  }
}

/** Registration number field for each company type (null = not applicable, e.g. HUF). */
export function registrationRule(companyType, country) {
  const india = country === 'IN';
  const generic = (v) => /^[A-Z0-9][A-Z0-9 ./-]{2,29}$/i.test(v);
  const genericError = 'Use 3–30 letters, numbers, spaces, “.”, “/” or “-”';
  switch (companyType) {
    case 'Private Limited Company':
      return india
        ? {
            label: 'Corporate Identification Number (CIN)',
            required: true,
            hint: '21 characters, as on the certificate of incorporation',
            placeholder: 'e.g. U85100MH2014PTC254871',
            test: (v) => /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/i.test(v),
            error: 'Enter a valid 21-character CIN, e.g. U85100MH2014PTC254871',
          }
        : {
            label: 'Company Registration Number',
            required: true,
            hint: 'As on the certificate of incorporation',
            placeholder: 'Company registration number',
            test: generic,
            error: genericError,
          };
    case 'Limited Liability Partnership (LLP)':
      return india
        ? {
            label: 'LLP Identification Number (LLPIN)',
            required: true,
            hint: 'Format AAA-1234',
            placeholder: 'e.g. AAB-1234',
            test: (v) => /^[A-Z]{3}-\d{4}$/i.test(v),
            error: 'Enter a valid LLPIN, e.g. AAB-1234',
          }
        : {
            label: 'LLP Registration Number',
            required: true,
            hint: 'As on the LLP incorporation certificate',
            placeholder: 'LLP registration number',
            test: generic,
            error: genericError,
          };
    case 'Trust':
      return {
        label: 'Trust Registration Number',
        required: true,
        hint: 'As on the trust registration certificate',
        placeholder: 'e.g. E-12345 (Mumbai)',
        test: generic,
        error: genericError,
      };
    case 'Firm':
      return {
        label: 'Firm Registration Number',
        required: false,
        hint: 'Optional for unregistered partnership firms',
        placeholder: 'Registrar of Firms number, if registered',
        test: generic,
        error: genericError,
      };
    case 'Government Entity':
      return {
        label: 'Department / Office Code',
        required: false,
        hint: 'Optional',
        placeholder: 'Departmental or registration code',
        test: generic,
        error: genericError,
      };
    default:
      return null;
  }
}

/** IBAN format + ISO 13616 mod-97 checksum. */
export function isValidIban(raw) {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

export function passwordChecks(pw) {
  return [
    { key: 'len', label: 'Minimum 8 characters', ok: pw.length >= 8 },
    { key: 'upper', label: 'One uppercase letter', ok: /[A-Z]/.test(pw) },
    { key: 'lower', label: 'One lowercase letter', ok: /[a-z]/.test(pw) },
    { key: 'num', label: 'One number', ok: /\d/.test(pw) },
    { key: 'special', label: 'One special character', ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}
