import { createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import type { BankDetailsInput, CompanyDetails, RegistrationDocKey } from '@/types';
import type { UploadedFile } from '@/components/ui/FileUpload';
import type { RegistrationDraft } from '@/services/registrationService';

export interface RegistrationState {
  company?: CompanyDetails;
  /** Company fields restored from a saved draft (may be incomplete); used to pre-fill the form. */
  companyDraft?: Partial<CompanyDetails>;
  /** Full bank details — kept in memory only until submission. */
  bank?: BankDetailsInput;
  /** Non-sensitive bank fields restored from a draft (account number must be re-entered). */
  bankDraft?: RegistrationDraft['bank'];
  documents: Partial<Record<RegistrationDocKey, UploadedFile | null>>;
}

export interface RegistrationContextValue {
  state: RegistrationState;
  /** Where /register should open: the saved step of a restored draft. */
  resumeAt: 'company' | 'bank';
  setCompany: (c: CompanyDetails) => void;
  setBank: (b: BankDetailsInput) => void;
  setDocument: (key: RegistrationDocKey, f: UploadedFile | null) => void;
  saveDraft: (step: RegistrationDraft['step'], patch: Pick<RegistrationDraft, 'company' | 'bank'>) => void;
  requestCancel: () => void;
  resetAll: () => void;
}

export const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function useRegistration(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used inside the registration layout');
  return ctx;
}

/** /register → continue at the saved step. */
export function RegistrationIndex() {
  const { resumeAt } = useRegistration();
  return <Navigate to={resumeAt} replace />;
}

export const REGISTRATION_STEPS = [
  { label: 'Company Details', description: 'Business & contact info' },
  { label: 'Bank Details', description: 'Payout account' },
  { label: 'Documents', description: 'KYC uploads' },
];

export const STEP_INDEX: Record<string, number> = {
  company: 0,
  bank: 1,
  documents: 2,
  submitted: 3,
  'verify-email': 3,
  credentials: 4,
  success: 4,
};
