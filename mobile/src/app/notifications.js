import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Bell, Clock, FileText, Loader } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { apiGet, apiPost } from '../lib/api';
import { goBack } from '../lib/nav';
import { Body, Screen, TopBar } from '../components/layout';
import { Button, Card, Spacer, Text } from '../components/ui';

const KIND = {
  stage_update: { bg: 'bg-primary-soft', color: '#1A5FC4', Icon: Loader },
  quotation_ready: { bg: 'bg-warning-soft', color: '#B4740D', Icon: Clock },
  document: { bg: 'bg-success-soft', color: '#1E8E4A', Icon: FileText },
  system: { bg: 'bg-cancel-soft', color: '#C23B3B', Icon: Bell },
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Notifications() {
  const { t, toast } = useApp();
  const [items, setItems] = useState([]);

  const load = () => {
    apiGet('/notifications')
      .then(({ notifications }) => setItems(notifications))
      .catch((err) => toast(err.message));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  useEffect(load, []);

  const markAllRead = async () => {
    try {
      await apiPost('/notifications/read-all', {});
      setItems((rows) => rows.map((r) => ({ ...r, readAt: new Date().toISOString() })));
      toast('All notifications marked as read.');
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <Screen>
      <TopBar
        title={t('notifications_title')}
        right={<Text className="font-inter-bold text-[13px] text-primary" onPress={markAllRead}>{t('btn_mark_read')}</Text>}
      />
      <Body contentClassName="gap-2.5 px-[18px] py-4">
        {items.map((n) => {
          const { bg, color, Icon } = KIND[n.kind] || KIND.system;
          const read = !!n.readAt;
          return (
            <Card key={n.id} className={`flex-row items-start gap-2.5 ${read ? 'opacity-55' : ''}`}>
              <View className={`h-8 w-8 items-center justify-center rounded-[10px] ${bg}`}><Icon size={16} color={color} /></View>
              <View className="flex-1">
                <View className="flex-row justify-between">
                  <Text className="font-inter-bold text-[14px]">{n.title}</Text>
                  <Text className="text-[11.5px] text-faint">{timeAgo(n.createdAt)}</Text>
                </View>
                {n.body ? <Text className="mt-1 text-[13px] text-muted">{n.body}</Text> : null}
              </View>
            </Card>
          );
        })}
        {items.length === 0 && (
          <View className="items-center px-5 py-[50px]"><Text className="text-[12.5px] text-faint">No notifications yet.</Text></View>
        )}
        <Spacer min={16} />
        <Button title={t('btn_return_home')} onPress={goBack} />
      </Body>
    </Screen>
  );
}
