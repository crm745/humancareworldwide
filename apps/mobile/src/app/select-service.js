import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { BackButton, Body, Screen } from '../components/layout';
import { Heading } from '../components/ui';
import { ServiceGrid } from '../components/ServiceGrid';

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
      </Body>
    </Screen>
  );
}
