// Masking helpers: full account numbers, emails and IDs never reach the UI after saving.

export const lastDigits = (value, n = 4) => value.replace(/\s+/g, '').slice(-n);

/** "XXXX XXXX 4582" */
export const maskAccount = (last4) => (last4 ? `XXXX XXXX ${last4}` : '—');

/** "vendor@company.com" → "v****@company.com" */
export function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user[0]}****@${domain}`;
}

/** "+91 98765 43210" → "+91 ••••• •3210" style: keep only the last 4 digits. */
export function maskPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  return `••••••${digits.slice(-4)}`;
}
