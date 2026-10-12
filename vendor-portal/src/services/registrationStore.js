import { readJSON, writeJSON } from '@/utils/storage';

const REG_KEY = 'hcw_mock_registrations';
const USERS_KEY = 'hcw_mock_users';
const SEQ_KEY = 'hcw_mock_vendor_seq';

export const listRegistrations = () => readJSON(REG_KEY, []);
export const saveRegistrations = (list) => writeJSON(REG_KEY, list);
export const getRegistration = (id) => listRegistrations().find((r) => r.id === id) ?? null;
export const getRegistrationByVendorId = (vendorId) => listRegistrations().find((r) => r.vendorId === vendorId) ?? null;

export function upsertRegistration(rec) {
  const list = listRegistrations().filter((r) => r.id !== rec.id);
  saveRegistrations([...list, rec]);
}

export const listUsers = () => readJSON(USERS_KEY, []);
export const saveUsers = (list) => writeJSON(USERS_KEY, list);

/** Reference IDs continue from HCW-VND-2026-00125. */
export function nextVendorId() {
  const seq = readJSON(SEQ_KEY, 125) + 1;
  writeJSON(SEQ_KEY, seq);
  return `HCW-VND-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
}
