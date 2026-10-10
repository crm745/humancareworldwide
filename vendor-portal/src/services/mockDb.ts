// localStorage-backed "database" for the mock API, one per vendor account.
// Seeded on first use; every mutation is written back so data survives reloads.
import { buildSeed, type SeedData } from '@/data/mockSeed';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import { getSession } from './session';
import { getRegistrationByVendorId } from './registrationStore';

const keyFor = (vendorId: string) => `hcw_mockdb_${vendorId}`;
let cache: { vendorId: string; data: SeedData } | null = null;

function currentVendorId(): string {
  return getSession()?.user.vendorId ?? 'HCW-VND-00125';
}

function load(): SeedData {
  const vendorId = currentVendorId();
  if (cache?.vendorId === vendorId) return cache.data;
  let data = readJSON<SeedData | null>(keyFor(vendorId), null);
  if (!data) {
    // A vendor who registered through the portal sees their own company + bank; sample operations data otherwise.
    const reg = getRegistrationByVendorId(vendorId);
    data = reg ? buildSeed(vendorId, reg.company, { ...reg.bank, verification: 'Verified' }, reg.submittedAt) : buildSeed(vendorId);
    writeJSON(keyFor(vendorId), data);
  }
  cache = { vendorId, data };
  return data;
}

export const mockDb = {
  get<K extends keyof SeedData>(key: K): SeedData[K] {
    return load()[key];
  },
  set<K extends keyof SeedData>(key: K, value: SeedData[K]): void {
    const data = load();
    data[key] = value;
    writeJSON(keyFor(currentVendorId()), data);
  },
  reset(): void {
    removeKey(keyFor(currentVendorId()));
    cache = null;
  },
};
