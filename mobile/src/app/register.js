import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { COUNTRY_CODES } from '../data/mock';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Consent, Field, FieldLabel, Heading, Input, Text } from '../components/ui';
import { Select } from '../components/widgets';

export default function Register() {
  const { t, toast } = useApp();
  const [name, setName] = useState('');
  const [cc, setCc] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consents, setConsents] = useState([true, true, true]);
  const ready = name && phone && email;
  const toggle = (i) => setConsents((c) => c.map((v, j) => (j === i ? !v : v)));

  const submit = () => {
    if (!ready) return;
    toast('OTP sent');
    router.push({ pathname: '/register-otp', params: { identifier: `${cc} ${phone}` } });
  };

  const link = (label, path) => <Text className="font-inter-bold text-primary" onPress={() => router.push(path)}>{label}</Text>;

  return (
    <Screen bg="bg-white">
      <View className="px-[26px] pt-[26px]"><BackButton /></View>
      <Body contentClassName="px-[26px] pb-[26px] pt-5">
        <Heading className="text-center text-[27.5px]">{t('register_title')}</Heading>
        <Text className="mb-7 mt-2.5 text-center text-[16.5px] text-muted">{t('register_sub')}</Text>
        <View className="gap-[18px]">
          <Field large label={t('field_full_name')} placeholder="Your full name" value={name} onChangeText={setName} />
          <View>
            <FieldLabel large>{t('field_mobile_number')}</FieldLabel>
            <View className="flex-row gap-2">
              <Select large value={cc} options={COUNTRY_CODES} onChange={setCc} title={t('field_mobile_number')} className="w-[84px]" />
              <Input large className="flex-1" placeholder="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            </View>
          </View>
          <Field large label={t('field_email_address')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
        <View className="mt-[18px] gap-3.5">
          <Consent on={consents[0]} onToggle={() => toggle(0)}>
            <Text className="text-[13.5px] leading-5 text-muted">
              By submitting the above information, you agree to our {link(t('register_terms_link'), '/terms')} and {link(t('privacy_title'), '/privacy')}
            </Text>
          </Consent>
          <Consent on={consents[1]} onToggle={() => toggle(1)}>
            <Text className="text-[13.5px] leading-5 text-muted">
              You are agreeing to receive communication reminding you about your account and updates about HumanCare WorldWide&apos;s services and programs.
            </Text>
          </Consent>
          <Consent on={consents[2]} onToggle={() => toggle(2)}>
            <Text className="text-[13.5px] leading-5 text-muted">
              Certain features on the platform are for informational and educational purposes only. It is not a medical device and does not provide professional medical advice, diagnosis, or treatment. Never disregard or delay seeking professional medical consultation because of information found here. Always consult a qualified healthcare provider regarding any medical condition.
            </Text>
          </Consent>
        </View>
        <Button large title={t('send_otp_btn')} dimmed={!ready} onPress={submit} className="mt-[26px]" />
        <Text className="mt-5 text-center text-[15px] text-muted">
          {t('register_login_q')} <Text className="font-inter-bold text-primary" onPress={() => router.push('/login')}>{t('cta_login')}</Text>
        </Text>
      </Body>
    </Screen>
  );
}
