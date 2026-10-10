import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import type { RegistrationRecord } from '@/types';
import type { TimelineItem } from '@/components/ui/StatusTimeline';
import { registrationService } from '@/services/registrationService';
import { useAsync } from '@/hooks/useAsync';

/** Loads the registration submitted in this browser session; sends the user back to step 1 if there is none. */
export function useCurrentRegistration() {
  const navigate = useNavigate();
  const id = registrationService.currentId();
  const state = useAsync<RegistrationRecord>(() => (id ? registrationService.get(id) : Promise.reject(new Error('none'))), [id]);

  useEffect(() => {
    if (!id || (state.error && !state.loading)) navigate('/register/company', { replace: true });
  }, [id, state.error, state.loading, navigate]);

  return state;
}

export function registrationTimeline(r: RegistrationRecord): TimelineItem[] {
  return [
    { title: 'Registration Submitted', description: 'Company, bank and document details received.', status: 'complete', date: r.submittedAt },
    { title: 'Document Verification', description: 'Compliance team reviews your KYC documents.', status: r.approved ? 'complete' : 'current' },
    { title: 'Bank Verification', description: 'Finance verifies the payout account with your bank proof.', status: r.approved ? 'complete' : 'pending' },
    {
      title: 'Vendor ID Generated',
      description: r.approved ? `Permanent Vendor ID ${r.vendorId} confirmed.` : `Reference ID ${r.vendorId} issued; confirmed after verification.`,
      status: r.approved ? 'complete' : 'pending',
    },
    { title: 'Email Verification', description: `Confirm ownership of ${r.email}.`, status: r.emailVerified ? 'complete' : 'current' },
    { title: 'Account Activated', description: 'Create your username and password to sign in.', status: r.credentialsCreated ? 'complete' : r.emailVerified && r.approved ? 'current' : 'pending' },
  ];
}
