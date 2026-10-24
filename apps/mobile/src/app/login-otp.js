import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';
import { apiPost } from '../lib/api';

export default function LoginOtp() {
  const { identifier } = useLocalSearchParams();

  const onVerify = async (code, currentId) => {
    const data = await apiPost('/auth/login/verify-otp', { identifier: currentId, code });
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      profile: { name: data.user.name, cc: data.user.countryCode || '+91', phone: data.user.mobile || '', email: data.user.email },
    };
  };

  const onResend = (currentId) => apiPost('/auth/login/request-otp', { identifier: currentId });

  // Edit link: same endpoint as resend, just targeting whatever new value was typed.
  const onChangeIdentifier = (newId) => apiPost('/auth/login/request-otp', { identifier: newId });

  return (
    <OtpScreen
      titleKey="otp_enter_title"
      identifier={identifier}
      session="patient"
      onVerify={onVerify}
      onResend={onResend}
      onChangeIdentifier={onChangeIdentifier}
    />
  );
}
