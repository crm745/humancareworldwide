import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { navReplace } from '../lib/nav';
import { BackButton, Body, Screen } from './layout';
import { Button, Heading, Spacer, Text } from './ui';
import { OtpInput, otpComplete } from './widgets';

// Shared by login-otp, register-otp and vendor-otp: 6 digits, then sign in as `session`.
export function OtpScreen({ titleKey, identifier, session, compact }) {
  const { t, toast, setSession } = useApp();
  const [code, setCode] = useState('');

  const verify = () => {
    if (!otpComplete(code)) { toast('Enter all 6 digits'); return; }
    setSession(session);
    navReplace('/home');
  };

  return (
    <Screen bg={compact ? 'bg-canvas' : 'bg-white'}>
      <Body contentClassName="p-[26px]">
        <BackButton className={compact ? 'mb-[22px]' : 'mb-10'} />
        <Heading className={compact ? 'text-[21.5px]' : 'text-center text-[27.5px]'}>{t(titleKey)}</Heading>
        <Text className={`${compact ? 'mb-6 mt-1.5 text-[14px]' : 'mb-8 mt-3.5 text-center text-[15.5px]'} text-muted`}>
          {t('otp_sent_to')} <Text className="font-inter-bold text-navy">{identifier}</Text>
        </Text>
        <OtpInput value={code} onChange={setCode} large={!compact} />
        <View className={`items-center ${compact ? 'mt-4' : 'mt-5'}`}>
          <Text className="text-[14.5px] text-faint">{t('otp_resend')}</Text>
        </View>
        <Spacer />
        <Button large={!compact} title={t('otp_verify_btn')} onPress={verify} />
      </Body>
    </Screen>
  );
}
