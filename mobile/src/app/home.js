import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Plus } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { LOGO } from '../data/images';
import { EMERGENCY_DISPLAY, EMERGENCY_TEL, VENDOR_IDENTITY } from '../data/mock';
import { navReplace } from '../lib/nav';
import { apiGet } from '../lib/api';
import { clearTokens } from '../lib/session';
import { registerForPushNotifications } from '../lib/pushNotifications';
import { Body, BottomNav, IconButton, Screen } from '../components/layout';
import { Button, Text } from '../components/ui';
import { ServiceGrid } from '../components/ServiceGrid';

function SosModal({ visible, onClose }) {
  const call = () => { onClose(); Linking.openURL(`tel:${EMERGENCY_TEL}`); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-navy/50 p-[26px]">
        <Pressable className="w-full items-center rounded-[20px] bg-white p-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-danger-soft"><Bell size={26} color="#D64545" strokeWidth={2.2} /></View>
          <Text className="mb-2 font-inter-black text-[16.5px] text-navy">Call Emergency Assistance?</Text>
          <Text className="mb-[22px] text-center text-[13.5px] leading-5 text-muted">
            This will immediately call our 24/7 emergency line at <Text className="font-inter-bold text-navy">{EMERGENCY_DISPLAY}</Text>.
          </Text>
          <View className="w-full flex-row gap-2.5">
            <Button variant="outline" title="Cancel" onPress={onClose} className="flex-1" />
            <Button variant="sos" title="Call Now" onPress={call} className="flex-1" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function Home() {
  const { t, isVendor, profile } = useApp();
  const [sos, setSos] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const firstName = (profile.name || '').split(' ')[0] || profile.name;

  useEffect(() => {
    if (isVendor) return;
    apiGet('/notifications?unreadOnly=true')
      .then(({ notifications }) => setHasUnread(notifications.length > 0))
      .catch(() => {});
    registerForPushNotifications();
  }, [isVendor]);

  const signOut = async () => {
    await clearTokens();
    navReplace('/welcome');
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between border-b border-line bg-white px-[18px] pb-4 pt-[22px]">
        <Image source={LOGO} style={{ height: 42, width: 42 * (360 / 135) }} resizeMode="contain" />
        <View className="flex-row items-center gap-2">
          <IconButton onPress={() => router.push('/notifications')}>
            <Bell size={16} color="#45526B" />
            {hasUnread && <View className="absolute right-[7px] top-1.5 h-[7px] w-[7px] rounded-full bg-[#E5484D]" />}
          </IconButton>
          <Text className="text-[12px] text-faint" onPress={signOut}>{t('sign_out')}</Text>
        </View>
      </View>

      <Body withNav contentClassName="px-[18px] pt-5">
        <View className="mb-5">
          <Text className="font-inter-black text-[20.5px] text-navy">{t('greeting')} {isVendor ? VENDOR_IDENTITY.name : firstName} 👋</Text>
          <Text className="mt-[3px] text-[14px] text-muted">{t('greetingSub')}</Text>
        </View>

        <Pressable onPress={() => router.push('/select-service')} className="mb-5 overflow-hidden rounded-[18px] active:opacity-90">
          <LinearGradient colors={['#1A73E8', '#3E8EF7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <View className="flex-1">
              <Text className="font-inter-black text-[16.5px] text-white">{t('createReq')}</Text>
              <Text className="mt-[7px] text-[13.5px] text-white opacity-90">{t('createReqSub')}</Text>
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white/25"><Plus size={17} color="#fff" strokeWidth={2.4} /></View>
          </LinearGradient>
        </Pressable>

        <Text className="mb-2.5 font-inter-black text-[13.5px] uppercase tracking-wide text-navy">{t('ourServices')}</Text>
        <ServiceGrid />

        <View className="mb-4 mt-4 flex-row items-center justify-between gap-2.5 rounded-2xl border border-danger-line bg-danger-soft p-3.5">
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-danger"><Bell size={19} color="#fff" strokeWidth={2.2} /></View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-black text-[13.5px] text-danger-dark">{t('sos_title')}</Text>
              <Text className="mt-0.5 text-[12px] text-[#97644E]">{t('sos_sub')}</Text>
            </View>
          </View>
          <Pressable onPress={() => setSos(true)} className="rounded-[10px] bg-danger px-4 py-2.5 active:opacity-85">
            <Text className="font-inter-black text-[13px] text-white">{t('sos_btn')}</Text>
          </Pressable>
        </View>
      </Body>

      <BottomNav />
      <SosModal visible={sos} onClose={() => setSos(false)} />
    </Screen>
  );
}
