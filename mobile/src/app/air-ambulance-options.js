import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { BackButton, Body, Screen } from '../components/layout';
import { Heading, Text } from '../components/ui';
import { PhotoCard } from '../components/widgets';
import { openService } from '../components/ServiceGrid';

const SHADOW = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } };

function Option({ img, title, sub, onPress }) {
  const { isRTL } = useApp();
  return (
    <PhotoCard img={img} height={170} onPress={onPress}>
      <View className="flex-row items-end justify-between gap-2.5">
        <View className="flex-1">
          <Text className="font-inter-black text-[15px] text-white" style={SHADOW}>{title}</Text>
          <Text className="mt-[3px] text-[12px] text-white opacity-95" style={SHADOW}>{sub}</Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-white/25" style={isRTL ? { transform: [{ scaleX: -1 }] } : null}>
          <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
        </View>
      </View>
    </PhotoCard>
  );
}

export default function AirAmbulanceOptions() {
  const { t } = useApp();
  return (
    <Screen>
      <View className="px-6 pt-[22px]">
        <BackButton className="mb-4" />
        <Heading className="mb-1.5 text-center text-[19.5px]">{t('svc_air')}</Heading>
        <Text className="mb-4 text-center text-[13px] text-muted">{t('air_amb_sub')}</Text>
      </View>
      <Body contentClassName="gap-5 px-6 pb-6">
        <Option img="IMG_COMMERCIALAIR" title={t('air_opt_charter_title')} sub={t('air_opt_charter_sub')} onPress={() => openService('privatecharter')} />
        <Option img="IMG_AIR" title={t('air_opt_commercial_title')} sub={t('air_opt_commercial_sub')} onPress={() => openService('commercialair')} />
      </Body>
    </Screen>
  );
}
