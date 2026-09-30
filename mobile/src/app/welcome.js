import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { WELCOME_BG } from '../data/images';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/layout';
import { Button } from '../components/ui';

export default function Welcome() {
  const { t } = useApp();
  return (
    <Screen bg="bg-white" className="px-[26px]">
      <View className="min-h-0 flex-1 items-center justify-center pt-[22px]">
        <Image source={WELCOME_BG} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>
      <Button large title={t('welcome_btn')} onPress={() => router.push('/login')} className="mb-11" />
    </Screen>
  );
}
