import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';
import { apiPost } from '../lib/api';

export default function VendorOtp() {
  const { identifier } = useLocalSearchParams();

  const onVerify = async (code) => {
    const data = await apiPost('/auth/vendor/otp/verify', { email: identifier, code });
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      profile: {
        name: data.vendorUser.vendor?.companyName || data.vendorUser.email,
        cc: '+91',
        phone: '',
        email: data.vendorUser.email,
      },
    };
  };

  return <OtpScreen compact titleKey="vendor_otp_title" identifier={identifier || 'corporate@company.com'} session="vendor" onVerify={onVerify} />;
}
