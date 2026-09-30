import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { SERVICE_TILES } from '../data/mock';
import { ServiceTile } from './widgets';

export function openService(key) {
  router.push(`/service/${key}`);
}

// 2-column grid of the 7 services, shared by Home and Select a Service.
export function ServiceGrid() {
  const { t } = useApp();
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {SERVICE_TILES.map((s) => (
        <ServiceTile
          key={s.key}
          img={s.img}
          title={t(s.title)}
          sub={t(s.sub)}
          onPress={() => (s.route ? router.push(s.route) : openService(s.key))}
        />
      ))}
    </View>
  );
}
