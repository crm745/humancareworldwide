import { useState } from 'react';
import { View } from 'react-native';
import { CircleCheck, CircleX, Clock, Loader } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { NOTIFICATIONS } from '../data/mock';
import { goBack } from '../lib/nav';
import { Body, Screen, TopBar } from '../components/layout';
import { Button, Card, Spacer, Text } from '../components/ui';

const KIND = {
  submitted: { bg: 'bg-warning-soft', color: '#B4740D', Icon: Clock },
  progress: { bg: 'bg-primary-soft', color: '#1A5FC4', Icon: Loader },
  completed: { bg: 'bg-success-soft', color: '#1E8E4A', Icon: CircleCheck },
  cancelled: { bg: 'bg-cancel-soft', color: '#C23B3B', Icon: CircleX },
};

export default function Notifications() {
  const { t, toast } = useApp();
  const [read, setRead] = useState(false);

  const markAllRead = () => { setRead(true); toast('All notifications marked as read.'); };

  return (
    <Screen>
      <TopBar
        title={t('notifications_title')}
        right={<Text className="font-inter-bold text-[13px] text-primary" onPress={markAllRead}>{t('btn_mark_read')}</Text>}
      />
      <Body contentClassName="gap-2.5 px-[18px] py-4">
        {NOTIFICATIONS.map((n) => {
          const { bg, color, Icon } = KIND[n.kind];
          return (
            <Card key={n.title} className={`flex-row items-start gap-2.5 ${read ? 'opacity-55' : ''}`}>
              <View className={`h-8 w-8 items-center justify-center rounded-[10px] ${bg}`}><Icon size={16} color={color} /></View>
              <View className="flex-1">
                <View className="flex-row justify-between">
                  <Text className="font-inter-bold text-[14px]">{t(n.title)}</Text>
                  <Text className="text-[11.5px] text-faint">{n.ago}</Text>
                </View>
                <Text className="mt-1 text-[13px] text-muted">{t(n.body)}</Text>
              </View>
            </Card>
          );
        })}
        <Spacer min={16} />
        <Button title={t('btn_return_home')} onPress={goBack} />
      </Body>
    </Screen>
  );
}
