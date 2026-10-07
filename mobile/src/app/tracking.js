import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Check, Plane } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { apiGet } from '../lib/api';
import { toUiStatus, formatDisplayDate } from '../lib/requestShape';
import { Body, Screen, TopBar } from '../components/layout';
import { Card, InfoRow, Pill, Spacer, Text } from '../components/ui';
import { DocRow } from '../components/widgets';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Stylised route map (placeholder until real map/live tracking is wired up).
function RouteMap({ origin, destination }) {
  return (
    <View className="h-[150px] overflow-hidden rounded-[14px]" style={{ direction: 'ltr' }}>
      <LinearGradient colors={['#DCEBFB', '#EAF3FE', '#E4F5EA']} locations={[0, 0.6, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
        <Svg viewBox="0 0 390 150" preserveAspectRatio="none" style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <Path d="M20 100 Q120 20 200 60 T370 40" stroke="#1A73E8" strokeWidth={2.5} strokeDasharray="6 5" fill="none" />
        </Svg>
        <View className="absolute bottom-2.5 left-3.5 rounded-md bg-white px-2 py-[3px]"><Text className="font-inter-black text-[11.5px]">{origin}</Text></View>
        <View className="absolute right-3.5 top-2.5 rounded-md bg-white px-2 py-[3px]"><Text className="font-inter-black text-[11.5px]">{destination}</Text></View>
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

function stageEventsToTimeline(stageEvents, status) {
  const rows = stageEvents.map((ev, i) => ({
    title: ev.stage,
    time: formatDisplayDate(ev.occurredAt),
    detail: ev.note,
    state: i < stageEvents.length - 1 ? 'done' : status === 'completed' || status === 'cancelled' ? 'done' : 'current',
  }));
  if (status !== 'completed' && status !== 'cancelled') {
    rows.push({ title: 'timeline_completed', time: 'timeline_pending', state: 'todo' });
  }
  return rows;
}

function Timeline({ rows }) {
  const { t } = useApp();
  return (
    <View>
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        return (
          <View key={`${row.title}-${i}`} className={`flex-row gap-3.5 ${last ? '' : 'pb-8'} ${row.state === 'todo' ? 'opacity-50' : ''}`}>
            {!last && <View className="absolute bottom-1 left-[12px] top-[26px] w-0.5 bg-line" />}
            <View className={`h-[26px] w-[26px] items-center justify-center rounded-full ${row.state === 'done' ? 'bg-success' : row.state === 'current' ? 'bg-primary' : 'bg-line'}`}>
              {row.state === 'done' && <Check size={13} color="#fff" strokeWidth={3} />}
              {row.state === 'current' && <Text className="font-inter-black text-[11.5px] text-white">●</Text>}
            </View>
            <View className="flex-1">
              <Text className={`font-inter-bold text-[14.5px] ${row.state === 'current' ? 'text-primary' : ''}`}>{row.state === 'todo' ? t(row.title) : row.title}</Text>
              <Text className="mt-[3px] text-[12.5px] text-faint">{row.state === 'todo' ? t(row.time) : row.time}</Text>
              {row.detail && <Text className="mt-1.5 text-[12.5px] leading-[19px] text-muted">{row.detail}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const TABS = [['overview', 'tab_overview'], ['timeline', 'tab_timeline'], ['docs', 'tab_documents']];

// A patient's ServiceRequest (with its linked Case nested inside) and a vendor's Case
// are different shapes from the backend — this flattens either one into what the UI
// below actually needs, so the rest of the screen doesn't care which it's looking at.
function fromRequest(request) {
  const c = request.case;
  return {
    referenceNumber: request.referenceNumber,
    serviceType: request.serviceType,
    origin: request.origin,
    destination: request.destination,
    status: request.status,
    patientLabel: `${request.patientName}${request.patientAge ? `, ${request.patientAge}` : ''}${request.patientGender ? ` / ${request.patientGender}` : ''}`,
    aircraft: c?.aircraft,
    stageEvents: c?.stageEvents || [],
    documents: c?.documents || [],
  };
}

function fromCase(c) {
  return {
    referenceNumber: c.referenceNumber,
    serviceType: c.serviceType,
    origin: c.origin,
    destination: c.destination,
    status: c.status,
    patientLabel: c.patientName,
    aircraft: c.aircraft,
    stageEvents: c.stageEvents || [],
    documents: c.documents || [],
  };
}

export default function Tracking() {
  const { t, toast } = useApp();
  const params = useLocalSearchParams();
  const isCase = params.kind === 'case';
  const [tab, setTab] = useState(params.tab || 'overview');
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (!params.id) return;
    const path = isCase ? `/vendor/cases/${params.id}` : `/requests/me/${params.id}`;
    apiGet(path)
      .then((data) => setItem(isCase ? fromCase(data.case) : fromRequest(data.request)))
      .catch((err) => toast(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per id/kind
  }, [params.id, isCase]);

  if (!item) return <Screen><TopBar title={t('tracking_details_title')} /></Screen>;

  return (
    <Screen>
      <TopBar title={t('tracking_details_title')} />
      <View className="flex-row items-center justify-between bg-white px-[18px] pt-3.5">
        <Text className="font-inter-black text-[14.5px] text-navy">{item.referenceNumber} · {item.serviceType}</Text>
        <Pill status={toUiStatus(item.status)} />
      </View>
      <View className="bg-white px-[18px] py-3.5"><RouteMap origin={item.origin} destination={item.destination} /></View>
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
            <InfoRow className="py-[13px]" label={t('lbl_status')} valueNode={<Pill status={toUiStatus(item.status)} />} />
            <InfoRow className="py-[13px]" label={t('lbl_service')} value={item.serviceType} />
            <InfoRow className="py-[13px]" label={t('lbl_from')} value={item.origin} />
            <InfoRow className="py-[13px]" label={t('lbl_to')} value={item.destination} />
            <InfoRow className="py-[13px]" label={t('lbl_patient')} value={item.patientLabel} />
            {item.aircraft && <InfoRow className="py-[13px]" label={t('lbl_aircraft')} value={item.aircraft} />}
            <InfoRow className="py-[13px]" last label={t('lbl_reference_number')} value={item.referenceNumber} />
          </Card>
        </Body>
      )}
      {tab === 'timeline' && (
        <Body contentClassName="px-5 py-6">
          <Timeline rows={stageEventsToTimeline(item.stageEvents, item.status)} />
        </Body>
      )}
      {tab === 'docs' && (
        <Body contentClassName="p-[18px]">
          {item.documents.length === 0 && <Text className="py-6 text-center text-[13px] text-faint">No documents uploaded yet.</Text>}
          {item.documents.map((d) => (
            <DocRow key={d.id} label={d.name} meta={d.fileSizeBytes ? `${Math.round(d.fileSizeBytes / 1024)} KB` : ''} onPress={() => Linking.openURL(`${API_URL}${d.fileUrl}`)} />
          ))}
          <Spacer min={14} />
        </Body>
      )}
    </Screen>
  );
}
