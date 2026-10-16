import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';
import { apiPost } from '../lib/api';

export default function CorporateOtp() {
  const { identifier } = useLocalSearchParams();

  const onVerify = async (code) => {
    const data = await apiPost('/auth/corporate/otp/verify', { email: identifier, code });
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      profile: {
        name: data.corporateUser.corporate?.companyName || data.corporateUser.email,
        cc: '+91',
        phone: '',
        email: data.corporateUser.email,
      },
    };
  };

  return <OtpScreen compact titleKey="corporate_otp_title" identifier={identifier || 'corporate@company.com'} session="corporate" onVerify={onVerify} />;
}
