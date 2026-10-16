import { Pressable, ScrollView, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, House, User } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { goBack, navReplace } from '../lib/nav';
import { Text, cx } from './ui';

// Full-height screen with safe-area padding. `bg` is a Tailwind background class.
export function Screen({ children, bg = 'bg-canvas', padded, className = '', style }) {
  const insets = useSafeAreaInsets();
  return (
    <View className={`flex-1 ${bg} ${padded ? 'px-[26px] pb-[26px]' : ''} ${className}`} style={[{ paddingTop: insets.top, paddingBottom: padded ? insets.bottom + 26 : 0 }, style]}>
      {children}
    </View>
  );
}

// Vertically scrolling body with no visible scrollbar (the prototype's .noscroll).
// Bottom padding is set here, not by contentClassName (the style would override any pb-* class):
// room for the tab bar when there is one, the device's safe area, and a gap so the last
// button never sits against the bottom edge or the gesture bar.
const BOTTOM_GAP = 32;
export function Body({ children, className = '', contentClassName = '', withNav, grow = true }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className={`flex-1 ${className}`}
      contentContainerClassName={`${grow ? 'flex-grow' : ''} ${contentClassName}`}
      contentContainerStyle={{ paddingBottom: (withNav ? 64 : 0) + BOTTOM_GAP + insets.bottom }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function IconButton({ children, onPress, className = '' }) {
  return (
    <Pressable onPress={onPress} className={cx('h-[34px] w-[34px] items-center justify-center rounded-full bg-soft active:opacity-70', className)}>
      {children}
    </Pressable>
  );
}

export function BackButton({ onPress = goBack, className = '' }) {
  const { isRTL } = useApp();
  return (
    <Pressable onPress={onPress} className={cx('h-9 w-9 items-center justify-center rounded-[10px] bg-soft active:opacity-70', className)}>
      <View style={isRTL ? { transform: [{ scaleX: -1 }] } : null}>
        <ChevronLeft size={22} color="#17233D" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

// White header bar: back button, centred title, optional right-hand element.
export function TopBar({ title, onBack, right, left }) {
  return (
    <View className="flex-row items-center justify-between border-b border-line bg-white px-[18px] pb-4 pt-[22px]">
      {left || <BackButton onPress={onBack} />}
      {title ? <Text className="font-inter-bold text-[15.5px] text-ink">{title}</Text> : null}
      {right || <View className="w-8" />}
    </View>
  );
}

const TABS = [
  { id: '/home', key: 'nav_home', Icon: House },
  { id: '/my-requests', key: 'nav_requests', Icon: FileText },
  { id: '/profile', key: 'nav_profile', Icon: User },
];

// Bottom tab bar. Corporates see "Cases" (corporate dashboard) in place of "Requests".
export function BottomNav() {
  const { t, isCorporate } = useApp();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute bottom-0 left-0 right-0 flex-row items-center justify-around border-t border-line bg-white"
      style={{ height: 64 + insets.bottom, paddingBottom: insets.bottom }}
    >
      {TABS.map(({ id, key, Icon }) => {
        const corporateCases = id === '/my-requests' && isCorporate;
        const target = corporateCases ? '/corporate-dashboard' : id;
        const on = pathname === target;
        const color = on ? '#1A73E8' : '#97A4B8';
        return (
          <Pressable key={id} onPress={() => navReplace(target)} className="items-center gap-[3px] px-4">
            <Icon size={18} color={color} strokeWidth={2} />
            <Text className={`font-inter-bold text-[11px] ${on ? 'text-primary' : 'text-faint'}`}>{corporateCases ? t('nav_cases') : t(key)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
