import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../state/AppContext';
import { Body, Screen } from '../components/layout';
import { Button, Field, Heading, Text } from '../components/ui';

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8Z" />
      <Path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8C4.1 20.6 7.8 23 12 23Z" />
      <Path fill="#FBBC05" d="M6 14.4c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7.2H2.3C1.5 8.7 1 10.3 1 12s.5 3.3 1.3 4.8Z" />
      <Path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.8 1 4.1 3.4 2.3 7.2l3.7 2.8c.9-2.5 3.2-4.6 6-4.6Z" />
    </Svg>
  );
}

function AppleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000">
      <Path d="M16.7 1c.1 1.2-.4 2.4-1.1 3.3-.8.9-2 1.6-3.1 1.5-.1-1.2.4-2.4 1.1-3.3C14.4 1.6 15.6 1 16.7 1Zm3.9 16.9c-.5 1.1-.7 1.6-1.4 2.6-.9 1.4-2.2 3.2-3.8 3.2-1.4 0-1.8-.9-3.7-.9s-2.4.9-3.7.9c-1.6 0-2.8-1.6-3.7-3-2.4-3.7-2.7-8.1-1.2-10.4 1.1-1.7 2.8-2.7 4.4-2.7 1.6 0 2.6 1 3.9 1s2.1-1 3.9-1c1.5 0 3 .8 4.1 2.2-3.6 2-3 7.2 1.2 8.1Z" />
    </Svg>
  );
}

export default function Login() {
  const { t, toast } = useApp();
  const [id, setId] = useState('');

  const submit = () => {
    if (!id) return;
    toast('OTP sent');
    router.push({ pathname: '/login-otp', params: { identifier: id } });
  };
  const social = () => toast('Demo only — social login not wired up.');

  return (
    <Screen bg="bg-white">
      <Body contentClassName="justify-center p-[26px]">
        <Heading className="text-center text-[29.5px]">{t('login_title')}</Heading>
        <Text className="mb-8 mt-2.5 text-center text-[16.5px] text-muted">{t('login_sub')}</Text>
        <Field large label={t('field_mobile_email')} placeholder="+91 98765 43210 or email" value={id} onChangeText={setId} autoCapitalize="none" />
        <Button large title={t('send_otp_btn')} dimmed={!id} onPress={submit} className="mt-[30px]" />
        <Text className="my-[22px] text-center text-[14px] text-faint">{t('login_or')}</Text>
        <View className="flex-row justify-center gap-3">
          {[GoogleMark, AppleMark].map((Mark, i) => (
            <Pressable key={i} onPress={social} className="h-12 w-[76px] items-center justify-center rounded-xl bg-soft active:opacity-70">
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
