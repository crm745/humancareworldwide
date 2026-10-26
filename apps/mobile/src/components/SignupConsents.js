import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { Consent, Text } from './ui';

// The three sign-up consents, shared by the sign-up form and the Google/Apple "complete
// your profile" screen so both show the same wording. Changing any of this text means
// bumping CONSENT_VERSION in the backend's auth.controller.js.
// `value` is [termsPrivacy, medicalDisclaimer, marketing]; the first two are required.
export function SignupConsents({ value, onChange }) {
  const { t } = useApp();
  const toggle = (i) => onChange(value.map((v, j) => (j === i ? !v : v)));
  const link = (label, path) => <Text className="font-inter-bold text-primary" onPress={() => router.push(path)}>{label}</Text>;

  return (
    <View className="mt-[18px] gap-3.5">
      <Consent on={value[0]} onToggle={() => toggle(0)}>
        <Text className="text-[13.5px] leading-5 text-muted">
          By submitting the above information, you agree to our {link(t('register_terms_link'), '/terms')} and {link(t('privacy_title'), '/privacy')}
        </Text>
      </Consent>
      <Consent on={value[1]} onToggle={() => toggle(1)}>
        <Text className="text-[13.5px] leading-5 text-muted">
          Certain features on the platform are for informational and educational purposes only. It is not a medical device and does not provide professional medical advice, diagnosis, or treatment. Never disregard or delay seeking professional medical consultation because of information found here. Always consult a qualified healthcare provider regarding any medical condition.
        </Text>
      </Consent>
      <Consent on={value[2]} onToggle={() => toggle(2)}>
        <Text className="text-[13.5px] leading-5 text-muted">
          You are agreeing to receive communication reminding you about your account and updates about HumanCare World Wide&apos;s services and programs.
        </Text>
      </Consent>
    </View>
  );
}

// What the backend expects under `consents`.
export function consentsBody(value) {
  return { termsPrivacy: value[0], medicalDisclaimer: value[1], marketing: value[2] };
}
