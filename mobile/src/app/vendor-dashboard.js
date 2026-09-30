import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { CASES_TODAY, VENDOR_CASES } from '../data/mock';
import { DEFAULT_FILTERS, applyFilters } from '../lib/filters';
import { Body, BottomNav, Screen, TopBar } from '../components/layout';
import { Button, Card, Pill, Spacer, Text } from '../components/ui';
import { FilterSheet } from '../components/FilterSheet';
import { SearchHeader } from '../components/SearchHeader';

const STAGES = ['all', 'submitted', 'progress', 'scheduled'];
const FILTER_SERVICES = [
  { value: 'air', labelKey: 'svc_air' },
  { value: 'ground', labelKey: 'svc_ground' },
  { value: 'hospital', labelKey: 'filter_svc_hospital' },
  { value: 'homecare', labelKey: 'filter_svc_homecare' },
];

function Stat({ value, label, tone }) {
  const blue = tone === 'active';
  return (
    <Card className={`flex-1 items-center ${blue ? 'border-[#CFE0FB] bg-primary-soft' : ''}`}>
      <Text className={`font-inter-black text-[17.5px] ${blue ? 'text-primary-dark' : tone === 'done' ? 'text-success' : 'text-ink'}`}>{value}</Text>
      <Text className={`mt-0.5 text-[10.5px] ${blue ? 'text-primary-dark' : 'text-faint'}`}>{label}</Text>
    </Card>
  );
}

export default function VendorDashboard() {
  const { t } = useApp();
  const [stage, setStage] = useState('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState(false);

  const count = (s) => VENDOR_CASES.filter((c) => s === 'all' || c.stage === s).length;
  const q = query.trim().toLowerCase();
  const cases = applyFilters(VENDOR_CASES, filters, CASES_TODAY).filter(
    (c) => (stage === 'all' || c.stage === stage) && (!q || `${c.id} ${c.patient} ${c.route}`.toLowerCase().includes(q))
  );

  return (
    <Screen>
      <TopBar title={t('lbl_all_cases')} />
      <SearchHeader
        placeholder="Search by Case ID or Patient Name"
        query={query}
        onQuery={setQuery}
        onOpenFilters={() => setSheet(true)}
        chips={STAGES.map((s) => ({ value: s, label: `${t(s === 'all' ? 'chip_all' : 'status_' + s)} (${count(s)})` }))}
        value={stage}
        onChange={setStage}
      />
      <Body withNav contentClassName="px-[18px] pt-4">
        <View className="mb-3.5 flex-row gap-2">
          <Stat value="24" label={t('lbl_total')} />
          <Stat value="4" label={t('lbl_active')} tone="active" />
          <Stat value="20" label={t('lbl_done')} tone="done" />
        </View>
        <View className="gap-2.5">
          {cases.map((c) => (
            <Card key={c.id} onPress={() => router.push('/tracking')}>
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="font-inter-black text-[12.5px] text-primary">{c.id}</Text>
                <Pill status={c.stage} />
              </View>
              <Text className="font-inter-bold text-[14.5px]">{c.patient}</Text>
              <Text className="text-[12.5px] text-faint">{c.route}</Text>
            </Card>
          ))}
        </View>
        {cases.length === 0 && <Text className="py-[30px] text-center text-[13.5px] text-faint">{t('empty_no_cases')}</Text>}
        <Spacer min={16} />
        <Button icon={<Plus size={16} color="#fff" strokeWidth={2.4} />} title={t('btn_initiate_new_case')} onPress={() => router.push('/vendor-new-case')} className="mt-3.5" />
      </Body>
      <BottomNav />
      <FilterSheet visible={sheet} onClose={() => setSheet(false)} title={t('filter_cases_title')} services={FILTER_SERVICES} value={filters} onApply={setFilters} />
    </Screen>
  );
}
