import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { BackButton, Body, Screen } from '../components/layout';
import { Heading, Text } from '../components/ui';
import { PhotoCard } from '../components/widgets';
import { ServiceGrid } from '../components/ServiceGrid';

const SHADOW = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } };

export default function SelectService() {
  const { t } = useApp();
  return (
    <Screen>
      <View className="px-[18px] pt-[22px]">
        <BackButton className="mb-4" />
        <Heading className="mb-4 text-center text-[19.5px]">{t('select_service_title')}</Heading>
      </View>
      <Body contentClassName="px-[18px] pb-[18px]">
        <ServiceGrid />
        <PhotoCard img="IMG_CARE_BANNER" height={130} className="mt-4" onPress={() => router.push('/help-support')}>
          <Text className="text-[12px] text-white opacity-95" style={SHADOW}>{t('care_banner_line1')}</Text>
          <Text className="font-inter-black text-[16.5px] text-white" style={SHADOW}>{t('care_banner_line2')}</Text>
        </PhotoCard>
      </Body>
    </Screen>
  );
}
