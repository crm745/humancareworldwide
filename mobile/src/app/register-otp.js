import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';

export default function RegisterOtp() {
  const { identifier } = useLocalSearchParams();
  return <OtpScreen titleKey="register_otp_title" identifier={identifier} session="patient" />;
}
