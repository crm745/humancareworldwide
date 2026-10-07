import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppContext';
import { navReplace } from '../lib/nav';
import { apiPost } from '../lib/api';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Heading, Spacer, Text } from '../components/ui';
import { OtpInput, PasswordField, otpComplete } from '../components/widgets';

export default function ResetPassword() {
  const { t, toast } = useApp();
  const { identifier, origin = '/login' } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = otpComplete(code) && pwd1.length >= 8 && pwd1 === pwd2;

  const submit = async () => {
    if (!otpComplete(code)) { toast('Enter all 6 digits'); return; }
    if (pwd1.length < 8) { toast('Password must be at least 8 characters'); return; }
    if (pwd1 !== pwd2) { toast('Passwords do not match'); return; }
    setBusy(true);
    try {
      await apiPost('/auth/reset-password', { email: identifier, code, newPassword: pwd1 });
      toast('Password updated successfully');
      navReplace(origin);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bg="bg-white">
      <Body contentClassName="p-[26px]">
        <BackButton className="mb-10" />
        <Heading className="text-center text-[27.5px]">{t('reset_pwd_title')}</Heading>
        <Text className="mb-8 mt-3.5 text-center text-[15.5px] text-muted">
          {t('otp_sent_to')} <Text className="font-inter-bold text-navy">{identifier}</Text>
        </Text>
        <OtpInput large value={code} onChange={setCode} />
        <View className="mb-[34px] mt-5 items-center">
          <Text className="text-[14.5px] text-faint">{t('otp_resend')}</Text>
        </View>
        <View className="gap-5">
          <PasswordField
            required label={t('reset_pwd_new_label')} placeholder="Minimum 8 characters" value={pwd1} onChangeText={setPwd1}
            error={pwd1 && pwd1.length < 8 ? 'Password must be at least 8 characters.' : undefined}
          />
          <PasswordField
            required label={t('reset_pwd_confirm_label')} placeholder="Re-enter new password" value={pwd2} onChangeText={setPwd2}
            error={pwd2 && pwd1 !== pwd2 ? 'Passwords do not match.' : undefined}
          />
        </View>
        <Spacer />
        <Button large title={t('reset_pwd_btn')} dimmed={!ready} loading={busy} onPress={submit} />
      </Body>
    </Screen>
  );
}
