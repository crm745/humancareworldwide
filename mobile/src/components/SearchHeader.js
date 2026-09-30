import { ScrollView, View } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { IconButton } from './layout';
import { Chip, Input } from './ui';

// Search box + filter button + horizontally scrolling status chips (My Requests, All Cases).
export function SearchHeader({ placeholder, query, onQuery, onOpenFilters, chips, value, onChange }) {
  return (
    <View className="border-b border-line bg-white px-[18px] py-3">
      <View className="mb-2.5 flex-row gap-2">
        <View className="flex-1 justify-center">
          <View className="absolute left-[11px] z-10"><Search size={15} color="#97A4B8" /></View>
          <Input placeholder={placeholder} value={query} onChangeText={onQuery} className="pl-8" />
        </View>
        <IconButton onPress={onOpenFilters} className="h-auto w-[46px] rounded-[10px]"><SlidersHorizontal size={16} color="#45526B" /></IconButton>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
        {chips.map((c) => <Chip key={c.value} label={c.label} on={value === c.value} onPress={() => onChange(c.value)} />)}
      </ScrollView>
    </View>
  );
}
