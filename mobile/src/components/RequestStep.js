import { useRef } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { Body, Screen, TopBar } from './layout';
import { Button, Spacer, Text } from './ui';
import { StepWizard } from './widgets';

// 3-step form: 1 Patient & Request Details → 2 Additional Information → 3 Review.
const NEXT = { 1: '/request/step2', 2: '/request/review' };

// Frame shared by the two form steps: top bar, step dots, heading, fields, Next.
// `ready` defaults to true (step 2's fields are all optional) — step 1 passes its own.
// `onInvalidNext` lets the step screen know a blocked Next tap happened, so it can
// start showing per-field errors on fields the person hasn't typed into yet (an
// empty required field previously showed no error at all until something was typed
// AND found invalid — tapping Next on a blank form just toasted a generic message
// with no indication of which field was the problem).
export function RequestStep({ step, headingKey, children, ready = true, onInvalidNext }) {
  const { t, toast } = useApp();
  const scrollRef = useRef(null);
  const next = () => {
    if (!ready) {
      toast('Please fill in the required fields correctly.');
      onInvalidNext?.();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    router.push(NEXT[step]);
  };
  return (
    <Screen>
      <TopBar title={t('new_request_title')} />
      <StepWizard step={step} />
      <Body ref={scrollRef} contentClassName="px-5 pt-6">
        {headingKey && <Text className="mb-[22px] font-inter-black text-[17px] text-navy">{t(headingKey)}</Text>}
        <View className="gap-5">{children}</View>
        <Spacer />
        <Button title={t('btn_next')} dimmed={!ready} onPress={next} className="mt-6" />
      </Body>
    </Screen>
  );
}
