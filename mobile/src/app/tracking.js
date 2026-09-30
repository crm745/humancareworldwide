import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Check, Plane } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { TRACKING_DOCS } from '../data/mock';
import { Body, Screen, TopBar } from '../components/layout';
import { Button, Card, InfoRow, Pill, Spacer, Text } from '../components/ui';
import { DocRow } from '../components/widgets';

// Stylised route map (placeholder until real map/live tracking is wired up).
function RouteMap() {
  return (
    <View className="h-[150px] overflow-hidden rounded-[14px]" style={{ direction: 'ltr' }}>
      <LinearGradient colors={['#DCEBFB', '#EAF3FE', '#E4F5EA']} locations={[0, 0.6, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
        <Svg viewBox="0 0 390 150" preserveAspectRatio="none" style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <Path d="M20 100 Q120 20 200 60 T370 40" stroke="#1A73E8" strokeWidth={2.5} strokeDasharray="6 5" fill="none" />
        </Svg>
        <View className="absolute bottom-2.5 left-3.5 rounded-md bg-white px-2 py-[3px]"><Text className="font-inter-black text-[11.5px]">Dubai, UAE</Text></View>
        <View className="absolute right-3.5 top-2.5 rounded-md bg-white px-2 py-[3px]"><Text className="font-inter-black text-[11.5px]">Mumbai, India</Text></View>
        <View
          className="absolute h-[26px] w-[26px] items-center justify-center rounded-full bg-primary"
          style={{ left: '56%', top: '36%', shadowColor: '#1A73E8', shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          <Plane size={14} color="#fff" strokeWidth={2.4} />
        </View>
      </LinearGradient>
    </View>
  );
}

const TIMELINE = [
  { title: 'timeline_submitted', time: '10 May 2024, 08:30 AM', detail: 'timeline_submitted_detail', state: 'done' },
  { title: 'timeline_confirmed', time: '10 May 2024, 11:15 AM', detail: 'timeline_confirmed_detail', state: 'done' },
  { title: 'status_progress', time: '10 May 2024, 01:45 PM', detail: 'timeline_progress_detail', state: 'current' },
  { title: 'timeline_completed', time: 'timeline_pending', state: 'todo' },
];

function Timeline() {
  const { t } = useApp();
  return (
    <View>
      {TIMELINE.map((row, i) => {
        const last = i === TIMELINE.length - 1;
        return (
          <View key={row.title} className={`flex-row gap-3.5 ${last ? '' : 'pb-8'} ${row.state === 'todo' ? 'opacity-50' : ''}`}>
            {!last && <View className="absolute bottom-1 left-[12px] top-[26px] w-0.5 bg-line" />}
            <View className={`h-[26px] w-[26px] items-center justify-center rounded-full ${row.state === 'done' ? 'bg-success' : row.state === 'current' ? 'bg-primary' : 'bg-line'}`}>
              {row.state === 'done' && <Check size={13} color="#fff" strokeWidth={3} />}
              {row.state === 'current' && <Text className="font-inter-black text-[11.5px] text-white">●</Text>}
            </View>
            <View className="flex-1">
              <Text className={`font-inter-bold text-[14.5px] ${row.state === 'current' ? 'text-primary' : ''}`}>{t(row.title)}</Text>
              <Text className="mt-[3px] text-[12.5px] text-faint">{row.state === 'todo' ? t(row.time) : row.time}</Text>
              {row.detail && <Text className="mt-1.5 text-[12.5px] leading-[19px] text-muted">{t(row.detail)}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const TABS = [['overview', 'tab_overview'], ['timeline', 'tab_timeline'], ['docs', 'tab_documents']];

export default function Tracking() {
  const { t, toast } = useApp();
  const params = useLocalSearchParams();
  const [tab, setTab] = useState(params.tab || 'overview');

  return (
    <Screen>
      <TopBar title={t('tracking_details_title')} />
      <View className="flex-row items-center justify-between bg-white px-[18px] pt-3.5">
        <Text className="font-inter-black text-[14.5px] text-navy">REQ-1005 · Air Ambulance</Text>
        <Pill status="progress" />
      </View>
      <View className="bg-white px-[18px] py-3.5"><RouteMap /></View>
      <View className="flex-row border-b border-line bg-white">
        {TABS.map(([id, key]) => (
          <Pressable key={id} onPress={() => setTab(id)} className={`flex-1 items-center border-b-2 py-3 ${tab === id ? 'border-primary' : 'border-transparent'}`}>
            <Text className={`font-inter-bold text-[13px] ${tab === id ? 'text-primary' : 'text-faint'}`}>{t(key)}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'overview' && (
        <Body contentClassName="p-[22px]">
          <Card className="p-[18px]">
            <InfoRow className="py-[13px]" label={t('lbl_status')} valueNode={<Pill status="progress" />} />
            <InfoRow className="py-[13px]" label={t('lbl_service')} value="Air Ambulance" />
            <InfoRow className="py-[13px]" label={t('lbl_from')} value="Dubai, UAE" />
            <InfoRow className="py-[13px]" label={t('lbl_to')} value="Mumbai, India" />
            <InfoRow className="py-[13px]" label={t('lbl_patient')} value="Rakesh Sharma, 45 / Male" />
            <InfoRow className="py-[13px]" label={t('lbl_aircraft')} value="Falcon 2000LXS" />
            <InfoRow className="py-[13px]" last label={t('lbl_reference_number')} value="HC-AMB-77821" />
          </Card>
        </Body>
      )}
      {tab === 'timeline' && <Body contentClassName="px-5 py-6"><Timeline /></Body>}
      {tab === 'docs' && (
        <Body contentClassName="p-[18px]">
          {TRACKING_DOCS.map((d) => (
            <DocRow key={d.label} label={t(d.label)} meta={d.meta} onPress={() => toast(`Downloading ${t(d.label)}…`)} />
          ))}
          <Spacer min={14} />
          <Button title={t('btn_download_report')} onPress={() => toast('Downloading Medical Report…')} className="mt-1.5" />
        </Body>
      )}
    </Screen>
  );
}
