import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { COUNTRY_CODES, COUNTRY_CODE_LABELS } from '../data/mock';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Field, FieldLabel, Heading, Input, Text } from '../components/ui';
import { Select } from '../components/widgets';
import { SignupConsents, consentsBody } from '../components/SignupConsents';
import { apiPost } from '../lib/api';
import { codeStepFrom, getAuthStep, setAuthStep } from '../lib/authFlow';
import { isValidMobileNumber, isValidName } from '../lib/validators';

// Sign-up for someone new who tapped Google/Apple on the Login screen. The provider
// already gave us (and verified) their email and name, so this only asks for the
// mobile number and the consents; the mobile code on register-otp.js finishes the
// account and lands on Home. No password: they sign in with Google/Apple.
export default function CompleteProfile() {
  const { t, toast } = useApp();
  const [step] = useState(() => getAuthStep('social-signup'));
  const [name, setName] = useState(step?.name || '');
  const [cc, setCc] = useState('+91');
  const [phone, setPhone] = useState('');
  const [consents, setConsents] = useState([false, false, false]);
  const [busy, setBusy] = useState(false);
  if (!step) return <Redirect href="/login" />;

  const ready = isValidName(name) && isValidMobileNumber(phone, cc) && consents[0] && consents[1];

  const submit = async () => {
    if (!ready) { toast('Enter your name and a valid mobile number, and accept the required consents.'); return; }
    setBusy(true);
    try {
      const data = await apiPost('/auth/social/register', {
        signupTicket: step.signupTicket, name: name.trim(), mobile: phone.trim(), countryCode: cc,
        consents: consentsBody(consents),
      });
      toast('OTP sent');
      setAuthStep('register-otp', codeStepFrom(data));
      router.push('/register-otp');
    } catch (err) {
      toast(err.message);
      // The 15-minute sign-up ticket ran out: start again from the Google/Apple button.
      if (err.code === 'ticket_invalid') router.replace('/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bg="bg-white">
      <View className="px-[26px] pt-[26px]"><BackButton /></View>
      <Body contentClassName="px-[26px] pb-[26px] pt-5">
        <Heading className="text-center text-[27.5px]">{t('complete_profile_title')}</Heading>
        <Text className="mb-7 mt-2.5 text-center text-[16.5px] text-muted">{t('complete_profile_sub')}</Text>
        <View className="gap-[18px]">
          <Field
            large label={t('field_email_address')} value={step.email} editable={false} className="opacity-70"
          />
          <Field
            large required label={t('field_full_name')} placeholder="Your full name" value={name} onChangeText={setName}
            error={name && !isValidName(name) ? 'Enter a valid name.' : undefined}
          />
          <View>
            <FieldLabel large required>{t('field_mobile_number')}</FieldLabel>
            <View className="flex-row gap-2">
              <Select large value={cc} options={COUNTRY_CODES} labels={COUNTRY_CODE_LABELS} onChange={setCc} title={t('field_mobile_number')} className="w-28" />
              <Input large className="flex-1" placeholder="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            </View>
            {phone && !isValidMobileNumber(phone, cc) ? <Text className="mt-1 text-[12px] text-danger">Enter a valid mobile number for the selected country.</Text> : null}
          </View>
        </View>
        <SignupConsents value={consents} onChange={setConsents} />
        <Button large title={t('send_otp_btn')} dimmed={!ready} loading={busy} onPress={submit} className="mt-[26px]" />
      </Body>
    </Screen>
  );
}
