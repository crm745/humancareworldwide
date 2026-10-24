import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Mail, Phone } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { Body, Screen } from '../components/layout';
import { Button, FieldLabel, Heading, Input, Text } from '../components/ui';
import { PasswordField, Select } from '../components/widgets';
import { navReplace } from '../lib/nav';
import { apiPost } from '../lib/api';
import { saveTokens } from '../lib/session';
import { setAuthStep } from '../lib/authFlow';
import { profileFromUser } from '../lib/profile';
import { useSocialAuth } from '../lib/useSocialAuth';
import { isValidEmail, isValidMobileNumber } from '../lib/validators';
import { COUNTRY_CODES, COUNTRY_CODE_LABELS } from '../data/mock';

export default function Login() {
  const { t, toast, setSession, setProfile } = useApp();
  // Phone and email used to share one field that guessed which you meant — split into
  // two explicit modes instead, so there's no ambiguity and the country code always
  // has a home next to the number.
  const [mode, setMode] = useState('phone');
  const [phone, setPhone] = useState('');
  const [cc, setCc] = useState('+91');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const valid = mode === 'phone' ? isValidMobileNumber(phone, cc) : isValidEmail(email);
  const ready = valid && password.length > 0;

  // Password first; the backend then texts an OTP to the registered mobile and
  // login-otp.js finishes the sign-in with the ticket it hands back.
  const submit = async () => {
    if (!ready) return;
    setFormError(null);
    setBusy(true);
    try {
      const body = mode === 'phone' ? { mobile: phone.trim(), countryCode: cc, password } : { email: email.trim(), password };
      const data = await apiPost('/auth/login', body);
      setAuthStep('login-otp', { ticket: data.ticket, contact: data.maskedContact, setup: !!data.needsPasswordSetup });
      router.push('/login-otp');
    } catch (err) {
      if (err.code === 'invalid_credentials' || err.code === 'account_locked') setFormError(err.message);
      else toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'phone' ? 'email' : 'phone');
    setFormError(null);
  };

  const afterSocialLogin = async ({ token, refreshToken, user }) => {
    await saveTokens({ token, refreshToken });
    if (user) setProfile(profileFromUser(user));
    setSession('patient');
    navReplace('/home');
  };

  const socialButtons = useSocialAuth({ toast, afterSocialLogin });

  return (
    <Screen bg="bg-white">
      <Body contentClassName="justify-center p-[26px]">
        <Heading className="text-center text-[29.5px]">{t('login_title')}</Heading>
        <Text className="mb-8 mt-2.5 text-center text-[16.5px] text-muted">{t('login_sub')}</Text>

        {mode === 'phone' ? (
          <>
            <FieldLabel large required>{t('field_mobile_number')}</FieldLabel>
            <View className="flex-row gap-2">
              <Select large value={cc} options={COUNTRY_CODES} labels={COUNTRY_CODE_LABELS} onChange={setCc} title={t('field_mobile_number')} className="w-28" />
              <Input large className="flex-1" placeholder="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
            {phone && !valid ? <Text className="mt-1 text-[12px] text-danger">Enter a valid number for the selected country.</Text> : null}
          </>
        ) : (
          <>
            <FieldLabel large required>{t('field_email_address')}</FieldLabel>
            <Input large placeholder="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {email && !valid ? <Text className="mt-1 text-[12px] text-danger">Enter a valid email address.</Text> : null}
          </>
        )}

        <View className="mt-[18px]">
          <PasswordField required label={t('field_password')} placeholder="Your password" value={password} onChangeText={setPassword} />
        </View>
        <View className="mt-2.5 items-end">
          <Text className="font-inter-bold text-[14.5px] text-primary" onPress={() => router.push({ pathname: '/forgot-password', params: { origin: '/login' } })}>
            {t('cta_forgot_password')}
          </Text>
        </View>

        {formError ? <Text className="mt-4 text-center text-[13.5px] text-danger">{formError}</Text> : null}
        <Button large title={t('login_btn')} disabled={!ready} loading={busy} onPress={submit} className={formError ? 'mt-4' : 'mt-[30px]'} />
        <Text className="my-[22px] text-center text-[14px] text-faint">{t('login_or')}</Text>
        <View className="gap-2.5">
          <Pressable
            onPress={switchMode}
            className="h-12 flex-row items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-field bg-white active:opacity-80"
          >
            {mode === 'phone' ? <Mail size={20} color="#45526B" /> : <Phone size={20} color="#45526B" />}
            <Text className="font-inter-bold text-[14px] text-ink">{t(mode === 'phone' ? 'continue_with_email' : 'continue_with_phone')}</Text>
          </Pressable>
          {socialButtons.map(({ key, Mark, onPress, disabled }) => (
            <Pressable key={key} onPress={onPress} disabled={disabled} className="h-12 flex-row items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-field bg-white active:opacity-80 disabled:opacity-40">
              <Mark />
              <Text className="font-inter-bold text-[14px] text-ink">{t(`continue_with_${key}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-6 text-center text-[15px] text-muted">
          {t('login_signup_q')}{' '}
          <Text className="font-inter-bold text-primary" onPress={() => router.push('/register')}>{t('cta_signup')}</Text>
        </Text>
        <Text className="mt-3 text-center text-[14px] text-faint">
          {t('login_corporate_q')}{' '}
          <Text className="font-inter-bold text-primary" onPress={() => router.push('/corporate-login')}>{t('cta_corporate_partner')}</Text>
        </Text>
      </Body>
    </Screen>
  );
}
