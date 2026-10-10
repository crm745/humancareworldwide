// Mock persistence for vendor registrations and portal user accounts (localStorage).
// Passwords are stored only as SHA-256 hashes; bank details only in masked form.
import type { RegistrationRecord } from '@/types';
import { readJSON, writeJSON } from '@/utils/storage';

const REG_KEY = 'hcw_mock_registrations';
const USERS_KEY = 'hcw_mock_users';
const SEQ_KEY = 'hcw_mock_vendor_seq';

export interface MockUser {
  vendorId: string;
  username: string;
  email: string;
  passwordHash: string;
  companyName: string;
  contactName: string;
}

export const listRegistrations = () => readJSON<RegistrationRecord[]>(REG_KEY, []);
export const saveRegistrations = (list: RegistrationRecord[]) => writeJSON(REG_KEY, list);
export const getRegistration = (id: string) => listRegistrations().find((r) => r.id === id) ?? null;
export const getRegistrationByVendorId = (vendorId: string) => listRegistrations().find((r) => r.vendorId === vendorId) ?? null;

export function upsertRegistration(rec: RegistrationRecord): void {
  const list = listRegistrations().filter((r) => r.id !== rec.id);
  saveRegistrations([...list, rec]);
}

export const listUsers = () => readJSON<MockUser[]>(USERS_KEY, []);
export const saveUsers = (list: MockUser[]) => writeJSON(USERS_KEY, list);

/** Reference IDs continue from HCW-VND-2026-00125. */
export function nextVendorId(): string {
  const seq = readJSON<number>(SEQ_KEY, 125) + 1;
  writeJSON(SEQ_KEY, seq);
  return `HCW-VND-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
}
