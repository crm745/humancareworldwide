// localStorage-backed "database" for the mock API, one per corporate account.
// Seeded on first use; every mutation is written back so data survives reloads.
import { buildSeed } from '@/data/mockSeed';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import { getSession } from './session';
import { getRegistrationByCorporateId } from './registrationStore';

const keyFor = (corporateId) => `hcw_mockdb_${corporateId}`;
let cache = null;

function currentCorporateId() {
  return getSession()?.user.corporateId ?? 'HCW-COR-00125';
}

function load() {
  const corporateId = currentCorporateId();
  if (cache?.corporateId === corporateId) return cache.data;
  let data = readJSON(keyFor(corporateId), null);
  if (!data) {
    // A corporate who registered through the portal sees their own company + bank; sample operations data otherwise.
    const reg = getRegistrationByCorporateId(corporateId);
    data = reg ? buildSeed(corporateId, reg.company, { ...reg.bank, verification: 'Verified' }, reg.submittedAt) : buildSeed(corporateId);
    writeJSON(keyFor(corporateId), data);
  }
  cache = { corporateId, data };
  return data;
}

export const mockDb = {
  get(key) {
    return load()[key];
  },
  set(key, value) {
    const data = load();
    data[key] = value;
    writeJSON(keyFor(currentCorporateId()), data);
  },
  reset() {
    removeKey(keyFor(currentCorporateId()));
    cache = null;
  },
};
