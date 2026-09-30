import { useEffect } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, { Easing, withDelay, withSequence, withSpring, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { BellRing, Check, ClipboardCheck, Phone, PhoneCall } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import SERVICES from '../../data/services.json';
import { EMERGENCY_DISPLAY, EMERGENCY_TEL } from '../../data/mock';
import { navReplace } from '../../lib/nav';
import { Body, Screen, TopBar } from '../../components/layout';
import { Button, Card, Heading, Pill, Spacer, Text } from '../../components/ui';

// Handshake pops in and wiggles, a ring pulses out, then the green check pops —
// the prototype's hs-enter / hs-shake / hs-pulse-ring / hs-pop keyframes.
function Celebration() {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-15);
  const ring = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 7, stiffness: 160 });
    rotate.value = withSequence(
      withTiming(0, { duration: 600 }),
      withTiming(-8, { duration: 140 }), withTiming(7, { duration: 140 }),
      withTiming(-5, { duration: 140 }), withTiming(4, { duration: 140 }), withTiming(0, { duration: 140 })
    );
    ring.value = withDelay(550, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }));
    check.value = withDelay(1100, withSpring(1, { damping: 8, stiffness: 180 }));
  }, [scale, rotate, ring, check]);

  const emoji = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }] }));
  const pulse = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - ring.value), transform: [{ scale: 0.6 + 1.1 * ring.value }] }));
  const badge = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: check.value }] }));

  return (
    <View className="mb-5 h-[130px] w-[130px] items-center justify-center rounded-full bg-primary-soft">
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: '#1A73E8' }, pulse]} />
      <Animated.Text style={[{ fontSize: 58, lineHeight: 70 }, emoji]}>🤝</Animated.Text>
      <Animated.View style={[{ position: 'absolute', right: 2, bottom: 4 }, badge]}>
        <View className="h-[30px] w-[30px] items-center justify-center rounded-full border-[3px] border-white bg-success">
          <Check size={14} color="#fff" strokeWidth={3} />
        </View>
      </Animated.View>
    </View>
  );
}

const STEPS = [
  ['next_step_call', PhoneCall],
  ['next_step_arrange', ClipboardCheck],
  ['next_step_updates', BellRing],
];

// Mock reference; the backend's POST /requests will return the real one (ROADMAP.md §3).
const MOCK_REQUEST_ID = 'REQ-1006';

export default function RequestSubmitted() {
  const { t, draft } = useApp();
  const service = (SERVICES[draft.service] || SERVICES.air).title;
  return (
    <Screen>
      <TopBar title={t('request_submitted_title')} onBack={() => navReplace('/home')} />
      <Body contentClassName="items-center px-6 pt-6">
        <Celebration />
        <Heading className="text-[25px]">{t('thank_you_title')}</Heading>
        <Text className="mb-6 mt-2.5 max-w-[300px] text-center text-[15px] leading-[22px] text-muted">{t('request_received_sub')}</Text>

        <Card className="mb-3 w-full flex-row items-center justify-between px-[18px] py-4">
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] text-faint">{t('lbl_request_id')}</Text>
            <Text className="mt-0.5 font-inter-black text-[17px] text-navy">{MOCK_REQUEST_ID}</Text>
            <Text className="mt-0.5 text-[12.5px] text-muted" numberOfLines={1}>{service}</Text>
          </View>
          <Pill status="submitted" />
        </Card>

        <Card className="w-full p-[20px]">
          <Text className="mb-4 font-inter-black text-[13.5px] text-navy">{t('next_steps_label')}</Text>
          <View className="gap-4">
            {STEPS.map(([key, Icon]) => (
              <View key={key} className="flex-row items-center gap-3">
                <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-success-soft"><Icon size={16} color="#1E8E4A" /></View>
                <Text className="flex-1 text-[14px] leading-5">{t(key)}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Pressable onPress={() => Linking.openURL(`tel:${EMERGENCY_TEL}`)} className="mt-4 flex-row items-center gap-1.5">
          <Phone size={13} color="#1A73E8" />
          <Text className="text-[13px] text-muted">
            {t('urgent_help_q')} <Text className="font-inter-bold text-primary">{EMERGENCY_DISPLAY}</Text>
          </Text>
        </Pressable>

        <Spacer />
        <Button title={t('view_my_request_btn')} onPress={() => navReplace('/my-requests')} className="w-full" />
        <Button variant="ghost" title={t('btn_return_home')} onPress={() => navReplace('/home')} className="mt-2.5 w-full" />
      </Body>
    </Screen>
  );
}
