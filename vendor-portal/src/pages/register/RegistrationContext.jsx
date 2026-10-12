import { createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';

export const RegistrationContext = createContext(null);

export function useRegistration() {
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

export const STEP_INDEX = {
  company: 0,
  bank: 1,
  documents: 2,
  submitted: 3,
  'verify-email': 3,
  credentials: 4,
  success: 4,
};
