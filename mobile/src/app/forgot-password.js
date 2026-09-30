import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppContext';
import { goBack } from '../lib/nav';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Field, Heading, Spacer, Text } from '../components/ui';

export default function ForgotPassword() {
  const { t, toast } = useApp();
  const { origin = '/login' } = useLocalSearchParams();
  const [id, setId] = useState('');

  const submit = () => {
    if (!id) return;
    toast('Reset code sent');
    router.push({ pathname: '/reset-password', params: { identifier: id, origin } });
  };

  return (
    <Screen bg="bg-white">
      <Body contentClassName="p-[26px]">
        <BackButton className="mb-10" />
        <Heading className="text-center text-[27.5px]">{t('forgot_pwd_title')}</Heading>
        <Text className="mb-9 mt-3.5 text-center text-[16.5px] leading-[25px] text-muted">{t('forgot_pwd_sub')}</Text>
        <Field large label={t('field_mobile_email')} placeholder="Enter mobile or email" value={id} onChangeText={setId} autoCapitalize="none" />
        <Spacer />
        <Button large title={t('forgot_pwd_btn')} dimmed={!id} onPress={submit} />
        <Text className="mt-7 text-center text-[15px] text-muted">
          {t('forgot_pwd_remember_q')}{' '}
          <Text className="font-inter-bold text-primary" onPress={goBack}>{t('cta_back_to_login')}</Text>
        </Text>
      </Body>
    </Screen>
  );
}
