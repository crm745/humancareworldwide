import { useLocalSearchParams } from 'expo-router';
import { OtpScreen } from '../components/OtpScreen';

export default function LoginOtp() {
  const { identifier } = useLocalSearchParams();
  return <OtpScreen titleKey="otp_enter_title" identifier={identifier} session="patient" />;
}
