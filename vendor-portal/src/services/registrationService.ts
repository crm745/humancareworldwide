// New-vendor registration workflow:
// submit → reference Vendor ID → email verification → (48h review) → credentials → account active.
import type { BankDetailsInput, BankDetailsMasked, CompanyDetails, RegistrationDocumentMeta, RegistrationRecord } from '@/types';
import { randomId, sha256 } from '@/utils/crypto';
import { lastDigits } from '@/utils/mask';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import { ApiError, USE_MOCK_API, mockDelay } from './config';
import { http } from './http';
import { getRegistration, listUsers, nextVendorId, saveUsers, upsertRegistration } from './registrationStore';

const DRAFT_KEY = 'hcw_registration_draft';
const CURRENT_KEY = 'hcw_registration_current';

/** Drafts never contain account numbers / IBAN or files — those must be re-entered. */
export interface RegistrationDraft {
  savedAt: string;
  step: 'company' | 'bank' | 'documents';
  company?: Partial<CompanyDetails>;
  bank?: Partial<Omit<BankDetailsInput, 'accountNumber' | 'confirmAccountNumber' | 'iban'>>;
}

export function maskBank(b: BankDetailsInput): BankDetailsMasked {
  const domestic = b.bankType === 'Domestic';
  return {
    bankType: b.bankType,
    bankName: b.bankName.trim(),
    accountHolder: b.accountHolder.trim(),
    accountLast4: lastDigits(b.accountNumber),
    ...(domestic
      ? { ifsc: b.ifsc.toUpperCase(), branchName: b.branchName, branchAddress: b.branchAddress }
      : { swift: b.swift.toUpperCase(), ibanLast4: b.iban ? lastDigits(b.iban) : '', bankCountry: b.bankCountry, bankAddress: b.bankAddress, currency: b.currency }),
    verification: 'Pending Verification',
    updatedAt: new Date().toISOString(),
  };
}

export const registrationService = {
  saveDraft(draft: Omit<RegistrationDraft, 'savedAt'>): RegistrationDraft {
    const { bank, ...rest } = draft;
    let safeBank: RegistrationDraft['bank'];
    if (bank) {
      const { accountNumber: _a, confirmAccountNumber: _c, iban: _i, ...other } = bank as Partial<BankDetailsInput>;
      safeBank = other;
    }
    const saved: RegistrationDraft = { ...rest, bank: safeBank, savedAt: new Date().toISOString() };
    writeJSON(DRAFT_KEY, saved);
    return saved;
  },
  loadDraft: () => readJSON<RegistrationDraft | null>(DRAFT_KEY, null),
  clearDraft: () => removeKey(DRAFT_KEY),

  currentId: () => readJSON<string | null>(CURRENT_KEY, null, 'session'),
  setCurrentId: (id: string) => writeJSON(CURRENT_KEY, id, 'session'),
  clearCurrentId: () => removeKey(CURRENT_KEY, 'session'),

  async submit(company: CompanyDetails, bank: BankDetailsInput, documents: RegistrationDocumentMeta[]): Promise<RegistrationRecord> {
    if (!USE_MOCK_API) {
      // Real API receives the full bank details over HTTPS and files via multipart upload.
      const { data } = await http.post<RegistrationRecord>('/vendors/register', { company, bank, documents });
      return data;
    }
    await mockDelay(1200, 600);
    const record: RegistrationRecord = {
      id: randomId('reg_'),
      vendorId: nextVendorId(),
      company,
      bank: maskBank(bank),
      documents: documents.map((d) => ({ ...d, status: 'Pending Verification' })),
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

  async get(id: string): Promise<RegistrationRecord> {
    if (!USE_MOCK_API) return (await http.get<RegistrationRecord>(`/vendors/registrations/${id}`)).data;
    await mockDelay(250, 200);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    return rec;
  },

  async resendVerificationEmail(id: string): Promise<void> {
    if (!USE_MOCK_API) {
      await http.post(`/vendors/registrations/${id}/resend-verification`);
      return;
    }
    await mockDelay(700);
  },

  async changeEmail(id: string, email: string): Promise<RegistrationRecord> {
    if (!USE_MOCK_API) return (await http.patch<RegistrationRecord>(`/vendors/registrations/${id}/email`, { email })).data;
    await mockDelay(700);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    const updated = { ...rec, email: email.trim().toLowerCase(), emailVerified: false };
    upsertRegistration(updated);
    return updated;
  },

  /**
   * Mock only: stands in for the user clicking the link in the email AND HumanCare's
   * compliance team approving documents + bank details (up to 48 hours in production).
   */
  async simulateEmailVerification(id: string): Promise<RegistrationRecord> {
    if (!USE_MOCK_API) return (await http.get<RegistrationRecord>(`/vendors/registrations/${id}`)).data;
    await mockDelay(1100, 400);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    const updated: RegistrationRecord = {
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

  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!USE_MOCK_API) return (await http.get<{ available: boolean }>('/vendors/username-available', { params: { username } })).data.available;
    await mockDelay(300, 200);
    const reserved = ['admin', 'support', 'humancare', 'root', 'demo.vendor'];
    return !reserved.includes(username) && !listUsers().some((u) => u.username === username);
  },

  async createCredentials(id: string, username: string, password: string): Promise<RegistrationRecord> {
    if (!USE_MOCK_API) return (await http.post<RegistrationRecord>(`/vendors/registrations/${id}/credentials`, { username, password })).data;
    await mockDelay(1000, 400);
    const rec = getRegistration(id);
    if (!rec) throw new ApiError('Registration not found.', 404);
    if (!rec.emailVerified || !rec.approved) throw new ApiError('Your registration has not been verified yet.', 409);
    const users = listUsers();
    if (users.some((u) => u.username === username)) throw new ApiError('That username is already taken.', 409);
    users.push({
      vendorId: rec.vendorId,
      username,
      email: rec.email,
      passwordHash: await sha256(password),
      companyName: rec.company.companyName,
      contactName: rec.company.contactName,
    });
    saveUsers(users);
    const updated: RegistrationRecord = { ...rec, credentialsCreated: true, username, status: 'Active' };
    upsertRegistration(updated);
    return updated;
  },
};
