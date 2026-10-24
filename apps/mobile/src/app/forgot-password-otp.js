import { useState } from 'react';
import { Redirect } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';
import { apiPost } from '../lib/api';
import { getAuthStep, setAuthStep } from '../lib/authFlow';

// Patient forgot-password, step 2: the code proves they control the mobile/email they
// typed, then set-password takes the new password.
export default function ForgotPasswordOtp() {
  const [step] = useState(() => getAuthStep('forgot-password-otp'));
  if (!step) return <Redirect href="/forgot-password" />;
  const { ticket, contact } = step;

  const onVerify = async (code) => {
    const data = await apiPost('/auth/password/forgot/verify-otp', { ticket, code });
    setAuthStep('set-password', { ticket: data.setPasswordTicket, reason: 'reset' });
    return { next: '/set-password' };
  };

  const onResend = () => apiPost('/auth/otp/resend', { ticket });

  return <OtpScreen titleKey="reset_pwd_title" contact={contact} session="patient" onVerify={onVerify} onResend={onResend} />;
}
