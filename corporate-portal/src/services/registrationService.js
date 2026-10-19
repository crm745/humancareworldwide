import { randomId, sha256 } from '@/utils/crypto';
import { lastDigits } from '@/utils/mask';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import { ApiError, USE_MOCK_API, mockDelay } from './config';
import { http } from './http';
import { getRegistration, nextCorporateId, upsertRegistration } from './registrationStore';

const DRAFT_KEY = 'hcw_registration_draft';
const CURRENT_KEY = 'hcw_registration_current';

/** Drafts never contain account numbers / IBAN or files — those must be re-entered. */

export function maskBank(b) {
  const domestic = b.bankType === 'Domestic';
  return {
    bankType: b.bankType,
    bankName: b.bankName.trim(),
    accountHolder: b.accountHolder.trim(),
    accountLast4: lastDigits(b.accountNumber),
    ...(domestic
      ? { ifsc: b.ifsc.toUpperCase(), branchName: b.branchName, branchAddress: b.branchAddress }
      : {
          swift: b.swift.toUpperCase(),
          ibanLast4: b.iban ? lastDigits(b.iban) : '',
          bankCountry: b.bankCountry,
          bankAddress: b.bankAddress,
          currency: b.currency,
        }),
    verification: 'Pending Verification',
    updatedAt: new Date().toISOString(),
  };
}

export const registrationService = {
  saveDraft(draft) {
    const { bank, ...rest } = draft;
    let safeBank;
    if (bank) {
      const { accountNumber: _a, confirmAccountNumber: _c, iban: _i, ...other } = bank;
      safeBank = other;
    }
    const saved = { ...rest, bank: safeBank, savedAt: new Date().toISOString() };
    writeJSON(DRAFT_KEY, saved);
    return saved;
  },
  loadDraft: () => readJSON(DRAFT_KEY, null),
  clearDraft: () => removeKey(DRAFT_KEY),

  currentId: () => readJSON(CURRENT_KEY, null, 'session'),
  setCurrentId: (id) => writeJSON(CURRENT_KEY, id, 'session'),
  clearCurrentId: () => removeKey(CURRENT_KEY, 'session'),

  // documentFiles: [{ key, label, file }] — file is the real File object the person
  // picked, not just its name/size, so compliance can actually open what was uploaded.
  async submit(company, bank, documentFiles) {
    if (!USE_MOCK_API) {
      const form = new FormData();
      form.append('company', JSON.stringify(company));
      form.append('bank', JSON.stringify(bank));
      documentFiles.forEach((d) => form.append(d.key, d.file));
      const { data } = await http.post('/corporates/register', form);
      return data;
    }
    await mockDelay(1200, 600);
    const record = {
      id: randomId('reg_'),
      corporateId: nextCorporateId(),
      company,
      bank: maskBank(bank),
      documents: documentFiles.map((d) => ({ key: d.key, label: d.label, fileName: d.file.name, size: d.file.size, status: 'Uploaded' })),
      submittedAt: new Date().toISOString(),
      email: company.officialEmail.trim().toLowerCase(),
      emailVerified: false,
      approved: false,
      credentialsCreated: false,
      status: 'Pending Verification',
    };
    upsertRegistration(record);
    return record;
  },

  async get(id) {
    if (!USE_MOCK_API) return (await http.get(`/corporates/registrations/${id}`)).data;
    await mockDelay(250, 200);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    return rec;
  },

  async resendVerificationEmail(id) {
    if (!USE_MOCK_API) {
      await http.post(`/corporates/registrations/${id}/resend-verification`);
      return;
    }
    await mockDelay(700);
  },

  async changeEmail(id, email) {
    if (!USE_MOCK_API) return (await http.patch(`/corporates/registrations/${id}/email`, { email })).data;
    await mockDelay(700);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    const updated = { ...rec, email: email.trim().toLowerCase(), emailVerified: false };
    upsertRegistration(updated);
    return updated;
  },

  // Called when the registrant clicks the link in their email — VerifyEmailPage reads
  // the ?token= query param and calls this on mount.
  async verifyEmailToken(token) {
    if (!USE_MOCK_API) return (await http.get('/corporates/verify-email', { params: { token } })).data;
    await mockDelay(600, 300);
    throw new ApiError('Email links only work against the real backend — use "Simulate clicking the verification link" below in mock mode.', 400);
  },

  /**
   * Mock only: stands in for the user clicking the link in the email AND HumanCare's
   * compliance team approving documents + bank details (up to 48 hours in production).
   */
  async simulateEmailVerification(id) {
    if (!USE_MOCK_API) return (await http.get(`/corporates/registrations/${id}`)).data;
    await mockDelay(1100, 400);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    const updated = {
      ...rec,
      emailVerified: true,
      approved: true,
      status: 'Verified',
      bank: { ...rec.bank, verification: 'Verified' },
      documents: rec.documents.map((d) => ({ ...d, status: 'Verified' })),
    };
    upsertRegistration(updated);
    return updated;
  },

  async createCredentials(id, password) {
    if (!USE_MOCK_API) return (await http.post(`/corporates/registrations/${id}/credentials`, { password })).data;
    await mockDelay(1000, 400);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    if (!rec.emailVerified || !rec.approved) throw new ApiError('Your registration has not been verified yet.', 409);
    await sha256(password); // mirrors the real backend hashing a password, for mock-mode parity only
    const updated = { ...rec, credentialsCreated: true, status: 'Active' };
    upsertRegistration(updated);
    return updated;
  },
};
