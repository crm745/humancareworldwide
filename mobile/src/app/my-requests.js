import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppContext';
import { MY_REQUESTS, REQUESTS_TODAY, SERVICE_LABELS } from '../data/mock';
import { DEFAULT_FILTERS, applyFilters } from '../lib/filters';
import { Body, BottomNav, Screen, TopBar } from '../components/layout';
import { Card, Pill, Text } from '../components/ui';
import { FilterSheet } from '../components/FilterSheet';
import { SearchHeader } from '../components/SearchHeader';

const STATUSES = ['all', 'submitted', 'progress', 'completed', 'cancelled'];
const FILTER_SERVICES = Object.entries(SERVICE_LABELS).map(([value, labelKey]) => ({ value, labelKey }));

// `status` param comes from the Profile overview: all | active | completed.
// "active" (submitted + in progress) has no chip of its own, so no chip is highlighted for it.
export default function MyRequests() {
  const { t } = useApp();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState(params.status || 'all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState(false);

  const q = query.trim().toLowerCase();
  const items = applyFilters(MY_REQUESTS, filters, REQUESTS_TODAY).filter((r) => {
    const statusOk = status === 'all' || (status === 'active' ? ['submitted', 'progress'].includes(r.status) : r.status === status);
    const searchOk = !q || r.id.toLowerCase().includes(q) || t(SERVICE_LABELS[r.service]).toLowerCase().includes(q);
    return statusOk && searchOk;
  });

  return (
    <Screen>
      <TopBar title={t('my_requests_title')} />
      <SearchHeader
        placeholder="Search by Request ID or Service"
        query={query}
        onQuery={setQuery}
        onOpenFilters={() => setSheet(true)}
        chips={STATUSES.map((s) => ({ value: s, label: t(s === 'all' ? 'chip_all' : 'status_' + s) }))}
        value={status}
        onChange={setStatus}
      />
      <Body withNav contentClassName="gap-2.5 px-[18px] pt-4">
        {items.map((r) => (
          <Card key={r.id} onPress={() => router.push('/request-details')}>
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="font-inter-black text-[14.5px]">{r.id}</Text>
                <Text className="mt-0.5 text-[13px] text-muted">{t(SERVICE_LABELS[r.service])}</Text>
              </View>
              <Pill status={r.status} />
            </View>
            <View className="mt-2 flex-row items-center justify-between border-t border-divider pt-2">
              <Text className="text-[12px] text-faint">{r.display}</Text>
              <Text className="font-inter-bold text-[12.5px] text-primary">{t('view_details_cta')} &gt;</Text>
            </View>
          </Card>
        ))}
        {items.length === 0 && (
          <View className="items-center px-5 py-[50px]">
            <Text className="mb-1.5 font-inter-bold text-[14px] text-muted">{t('mr_empty_title')}</Text>
            <Text className="text-[12.5px] text-faint">{t('mr_empty_sub')}</Text>
          </View>
        )}
      </Body>
      <BottomNav />
      <FilterSheet visible={sheet} onClose={() => setSheet(false)} title={t('filter_requests_title')} services={FILTER_SERVICES} value={filters} onApply={setFilters} />
    </Screen>
  );
}
