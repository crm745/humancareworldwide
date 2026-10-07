import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { Body, Screen } from '../components/layout';
import { Button, Field, Heading, Text } from '../components/ui';
import { navReplace } from '../lib/nav';
import { apiPost } from '../lib/api';
import { saveTokens } from '../lib/session';
import { useSocialAuth } from '../lib/useSocialAuth';
import { isValidLoginIdentifier } from '../lib/validators';

export default function Login() {
  const { t, toast, setSession, setProfile } = useApp();
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidLoginIdentifier(id)) { toast('Enter a valid mobile number or email.'); return; }
    setBusy(true);
    try {
      await apiPost('/auth/login/request-otp', { identifier: id });
      toast('OTP sent');
      router.push({ pathname: '/login-otp', params: { identifier: id } });
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const afterSocialLogin = async ({ token, refreshToken, user }) => {
    await saveTokens({ token, refreshToken });
    if (user) setProfile({ name: user.name, cc: user.countryCode || '+91', phone: user.mobile || '', email: user.email });
    setSession('patient');
    navReplace('/home');
  };

  const socialButtons = useSocialAuth({ toast, afterSocialLogin });

  return (
    <Screen bg="bg-white">
      <Body contentClassName="justify-center p-[26px]">
        <Heading className="text-center text-[29.5px]">{t('login_title')}</Heading>
        <Text className="mb-8 mt-2.5 text-center text-[16.5px] text-muted">{t('login_sub')}</Text>
        <Field large label={t('field_mobile_email')} placeholder="98765 43210 or email" value={id} onChangeText={setId} autoCapitalize="none" required error={id && !isValidLoginIdentifier(id) ? 'Enter a valid mobile number or email.' : undefined} />
        <Button large title={t('send_otp_btn')} dimmed={!isValidLoginIdentifier(id)} loading={busy} onPress={submit} className="mt-[30px]" />
        <Text className="my-[22px] text-center text-[14px] text-faint">{t('login_or')}</Text>
        <View className="flex-row justify-center gap-3">
          {socialButtons.map(({ key, Mark, onPress, disabled }) => (
            <Pressable key={key} onPress={onPress} disabled={disabled} className="h-12 w-[76px] items-center justify-center rounded-xl bg-soft active:opacity-70 disabled:opacity-40">
              <Mark />
            </Pressable>
          ))}
        </View>
        <Text className="mt-6 text-center text-[15px] text-muted">
          {t('login_signup_q')}{' '}
          <Text className="font-inter-bold text-primary" onPress={() => router.push('/register')}>{t('cta_signup')}</Text>
        </Text>
        <Text className="mt-3 text-center text-[14px] text-faint">
          {t('login_vendor_q')}{' '}
          <Text className="font-inter-bold text-primary" onPress={() => router.push('/vendor-login')}>{t('cta_vendor_partner')}</Text>
        </Text>
      </Body>
    </Screen>
  );
}
