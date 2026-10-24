import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppContext';
import { goBack } from '../lib/nav';
import { apiPost } from '../lib/api';
import { isValidEmail } from '../lib/validators';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Field, Heading, Spacer, Text } from '../components/ui';

export default function ForgotPassword() {
  const { t, toast } = useApp();
  const { origin = '/login' } = useLocalSearchParams();
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(id)) { toast('Enter a valid email.'); return; }
    setBusy(true);
    try {
      await apiPost('/auth/forgot-password', { email: id });
      toast('If that account exists, a reset code has been sent.');
      router.push({ pathname: '/reset-password', params: { identifier: id, origin } });
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
        <Heading className="text-center text-[27.5px]">{t('forgot_pwd_title')}</Heading>
        <Text className="mb-9 mt-3.5 text-center text-[16.5px] leading-[25px] text-muted">{t('forgot_pwd_sub')}</Text>
        <Field
          large required label={t('field_email_address')} placeholder="you@company.com" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address"
          error={id && !isValidEmail(id) ? 'Enter a valid email address.' : undefined}
        />
        <Spacer />
        <Button large title={t('forgot_pwd_btn')} dimmed={!isValidEmail(id) || busy} onPress={submit} />
        <Text className="mt-7 text-center text-[15px] text-muted">
          {t('forgot_pwd_remember_q')}{' '}
          <Text className="font-inter-bold text-primary" onPress={goBack}>{t('cta_back_to_login')}</Text>
        </Text>
      </Body>
    </Screen>
  );
}
