import { Image, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import SERVICES from '../../data/services.json';
import { IMAGES } from '../../data/images';
import { Body, Screen, TopBar } from '../../components/layout';
import { Button, Card, Heading, SectionLabel, Text } from '../../components/ui';

export default function ServiceDetail() {
  const { t, resetDraft } = useApp();
  const { key } = useLocalSearchParams();
  const s = SERVICES[key] || SERVICES.air;

  const start = () => {
    resetDraft(key);
    router.push('/request/step1');
  };

  return (
    <Screen>
      <TopBar title={t('service_detail_title')} />
      <Body contentClassName="p-[22px]">
        <View className="mb-5 min-h-[180px] flex-1 overflow-hidden rounded-2xl bg-primary">
          <Image source={IMAGES[s.img]} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <Heading className="text-[20.5px]">{s.title}</Heading>
        <Text className="mt-2.5 text-[14px] leading-[22px] text-muted">{s.desc}</Text>
        <View className="mt-[18px] flex-row gap-2">
          {s.stats.map((st) => (
            <Card key={st.label} className="flex-1 items-center justify-center px-1.5 py-3">
              <Text className="font-inter-black text-[15px] text-primary">{st.value}</Text>
              <Text className="mt-0.5 text-center text-[10px] text-faint">{st.label}</Text>
            </Card>
          ))}
        </View>
        <Card className="mt-[18px]">
          <SectionLabel className="mb-3">{t('we_provide_label')}</SectionLabel>
          <View className="gap-[9px]">
            {s.features.map((f) => (
              <View key={f} className="flex-row items-start gap-2">
                <View className="mt-px"><Check size={15} color="#2FA84F" strokeWidth={2.4} /></View>
                <Text className="flex-1 text-[13.5px]">{f}</Text>
              </View>
            ))}
          </View>
        </Card>
        <Button title={t('request_this_service_btn')} onPress={start} className="mt-5" />
      </Body>
    </Screen>
  );
}
