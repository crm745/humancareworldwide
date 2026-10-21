import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { OPS_EMAIL } from '../data/mock';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Card, Consent, Field, Heading, Text } from '../components/ui';
import { PasswordField } from '../components/widgets';
import { apiPost } from '../lib/api';
import { isValidEmail } from '../lib/validators';

export default function CorporateLogin() {
  const { t, toast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consents, setConsents] = useState([false, false]);
  const ready = isValidEmail(email) && password.length >= 8;
  const toggle = (i) => setConsents((c) => c.map((v, j) => (j === i ? !v : v)));

  // Password checks out -> backend sends an OTP -> corporate-otp.js does the actual verify+token step.
  const submit = async () => {
    if (!ready) { toast('Enter a valid email and password.'); return; }
    try {
      await apiPost('/auth/corporate/login', { email, password });
      router.push({ pathname: '/corporate-otp', params: { identifier: email } });
    } catch (err) {
      toast(err.message);
    }
  };

  const link = (label, path) => <Text className="font-inter-bold text-primary" onPress={() => router.push(path)}>{label}</Text>;

  return (
    <Screen bg="bg-white">
      <View className="px-[26px] pt-[26px]"><BackButton /></View>
      <Body contentClassName="px-[26px] pb-[26px] pt-10">
        <Heading className="text-[23.5px]">{t('corporate_login_title')}</Heading>
        <Text className="mb-7 mt-2.5 text-[15.5px] text-muted">{t('corporate_login_sub')}</Text>
        <View className="gap-[18px]">
          <Field
            large required label={t('field_email_address')} placeholder="corporate@company.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail}
            error={email && !isValidEmail(email) ? 'Enter a valid email address.' : undefined}
          />
          <PasswordField
            required label={t('field_password')} placeholder="Password issued by HumanCare" value={password} onChangeText={setPassword}
            error={password && password.length < 8 ? 'Password must be at least 8 characters.' : undefined}
          />
        </View>
        <View className="mt-2.5 items-end">
          <Text className="font-inter-bold text-[14.5px] text-primary" onPress={() => router.push({ pathname: '/forgot-password', params: { origin: '/corporate-login' } })}>
            {t('cta_forgot_password')}
          </Text>
        </View>
        <View className="mt-5 gap-3.5">
          <Consent on={consents[0]} onToggle={() => toggle(0)}>
            <Text className="text-[14px] leading-5 text-muted">I agree to the {link(t('terms_title'), '/terms')} and {link(t('privacy_title'), '/privacy')}</Text>
          </Consent>
          <Consent on={consents[1]} onToggle={() => toggle(1)}>
            <Text className="text-[14px] leading-5 text-muted">I confirm I am authorized to submit and manage cases for this organization.</Text>
          </Consent>
        </View>
        <Button large title={t('btn_sign_in')} dimmed={!ready} onPress={submit} className="mt-[26px]" />
        <Card className="mt-5">
          <Text className="text-[14px] leading-[22px] text-muted">
            <Text className="font-inter-bold text-navy">{t('lbl_new_corporate')}</Text> {t('corporate_contact_ops_text')} <Text className="text-primary">{OPS_EMAIL}</Text>
          </Text>
        </Card>
      </Body>
    </Screen>
  );
}
