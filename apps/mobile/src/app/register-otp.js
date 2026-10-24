import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';
import { apiPost } from '../lib/api';

export default function RegisterOtp() {
  const { identifier, name, email, mobile: initialMobile, countryCode } = useLocalSearchParams();
  const [mobile, setMobile] = useState(initialMobile);

  const onVerify = async (code) => {
    const data = await apiPost('/auth/register/verify-otp', { name, email, mobile, countryCode, code });
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      profile: { name: data.user.name, cc: data.user.countryCode || '+91', phone: data.user.mobile || '', email: data.user.email },
    };
  };

  const onResend = () => apiPost('/auth/register/request-otp', { name, email, mobile });

  // Register's OTP always goes to the mobile number (see auth.controller.js), so editing
  // the identifier here really means editing the mobile number — pull the digits back out
  // of whatever was typed and use that as the new mobile.
  const onChangeIdentifier = async (newValue) => {
    const newMobile = newValue.replace(/\D/g, '');
    await apiPost('/auth/register/request-otp', { name, email, mobile: newMobile });
    setMobile(newMobile);
  };

  return (
    <OtpScreen
      titleKey="register_otp_title"
      identifier={identifier}
      session="patient"
      onVerify={onVerify}
      onResend={onResend}
      onChangeIdentifier={onChangeIdentifier}
    />
  );
}
