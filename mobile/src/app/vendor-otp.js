import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';

export default function VendorOtp() {
  const { identifier } = useLocalSearchParams();
  return <OtpScreen compact titleKey="vendor_otp_title" identifier={identifier || 'corporate@company.com'} session="vendor" />;
}
