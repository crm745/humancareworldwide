import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { Body, Screen, TopBar } from './layout';
import { Button, Spacer, Text } from './ui';
import { StepWizard } from './widgets';

// 3-step form: 1 Patient & Request Details → 2 Additional Information → 3 Review.
const NEXT = { 1: '/request/step2', 2: '/request/review' };

// Frame shared by the two form steps: top bar, step dots, heading, fields, Next.
export function RequestStep({ step, headingKey, children }) {
  const { t } = useApp();
  return (
    <Screen>
      <TopBar title={t('new_request_title')} />
      <StepWizard step={step} />
      <Body contentClassName="px-5 pt-6">
        {headingKey && <Text className="mb-[22px] font-inter-black text-[17px] text-navy">{t(headingKey)}</Text>}
        <View className="gap-5">{children}</View>
        <Spacer />
        <Button title={t('btn_next')} onPress={() => router.push(NEXT[step])} className="mt-6" />
      </Body>
    </Screen>
  );
}
