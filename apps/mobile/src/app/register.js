import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { COUNTRY_CODES, COUNTRY_CODE_LABELS } from '../data/mock';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Field, FieldLabel, Heading, Input, Text } from '../components/ui';
import { SignupConsents, consentsBody } from '../components/SignupConsents';
import { PasswordField, Select } from '../components/widgets';
import { apiPost } from '../lib/api';
import { codeStepFrom, setAuthStep } from '../lib/authFlow';
import { PASSWORD_HINT, isValidEmail, isValidMobileNumber, isValidName, passwordProblem } from '../lib/validators';

// The sign-up form. Google/Apple buttons live on the Login screen only; someone new who
// uses them finishes on complete-profile.js (mobile + consents) instead of this form.
export default function Register() {
  const { t, toast } = useApp();
  const [name, setName] = useState('');
  const [cc, setCc] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [consents, setConsents] = useState([false, false, false]);
  // Consent 0 (terms/privacy) and 1 (medical disclaimer) are required; consent 2
  // (marketing communications) is optional, like most apps treat it — grouped last.
  const passwordError = password ? passwordProblem(password) : null;
  const confirmError = confirm && confirm !== password ? 'Passwords do not match.' : null;
  const ready = isValidName(name) && isValidMobileNumber(phone, cc) && isValidEmail(email)
    && password && !passwordError && confirm === password && consents[0] && consents[1];

  // Creates the account (unverified, password hashed server-side) and texts an OTP;
  // register-otp.js verifies it with the ticket and signs straight in.
  const submit = async () => {
    if (!ready) { toast('Enter a valid name, mobile number, email and password, and accept the required consents.'); return; }
    setBusy(true);
    try {
      // The backend saves these as proof of consent and refuses sign-up without the two required ones.
      const data = await apiPost('/auth/register', {
        name: name.trim(), email: email.trim(), mobile: phone.trim(), countryCode: cc, password,
        consents: consentsBody(consents),
      });
      toast('OTP sent');
      setAuthStep('register-otp', codeStepFrom(data));
      router.push('/register-otp');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bg="bg-white">
      <View className="px-[26px] pt-[26px]"><BackButton /></View>
      <Body contentClassName="px-[26px] pb-[26px] pt-5">
        <Heading className="text-center text-[27.5px]">{t('register_title')}</Heading>
        <Text className="mb-7 mt-2.5 text-center text-[16.5px] text-muted">{t('register_sub')}</Text>
        <View className="gap-[18px]">
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
          <Field
            large required label={t('field_email_address')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail}
            error={email && !isValidEmail(email) ? 'Enter a valid email address.' : undefined}
          />
          <PasswordField
            required label={t('field_password')} placeholder="Create a password" value={password} onChangeText={setPassword}
            error={passwordError} hint={PASSWORD_HINT}
          />
          <PasswordField
            required label={t('field_confirm_password')} placeholder="Re-enter your password" value={confirm} onChangeText={setConfirm}
            error={confirmError}
          />
        </View>
        <SignupConsents value={consents} onChange={setConsents} />
        <Button large title={t('send_otp_btn')} dimmed={!ready} loading={busy} onPress={submit} className="mt-[26px]" />
        <Text className="mt-6 text-center text-[15px] text-muted">
          {t('register_login_q')} <Text className="font-inter-bold text-primary" onPress={() => router.push('/login')}>{t('cta_login')}</Text>
        </Text>
      </Body>
    </Screen>
  );
}
