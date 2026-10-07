import { useRef, useState } from 'react';
import { Image, ImageBackground, Modal, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, Download, Eye, EyeOff, FileText, X } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { IMAGES } from '../data/images';
import { IconButton } from './layout';
import { FieldLabel, Input, Text } from './ui';

// Bottom sheet with a dimmed backdrop (filter, language and select sheets).
export function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useApp();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <Pressable onPress={onClose} className="absolute inset-0 bg-navy/45" />
        <View className="rounded-t-[20px] bg-white px-5 pt-5" style={{ paddingBottom: 24 + insets.bottom }}>
          <View className="mb-[18px] flex-row items-center justify-between">
            <Text className="font-inter-black text-[16px] text-navy">{title}</Text>
            <IconButton onPress={onClose} className="h-[30px] w-[30px]"><X size={16} color="#45526B" /></IconButton>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// Stand-in for the prototype's <select>: looks like an input, opens a sheet of options.
export function Select({ value, options, onChange, title, large, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between gap-1 rounded-[10px] border-[1.5px] border-field bg-input ${large ? 'px-3 py-3.5' : 'px-3 py-3'} ${className}`}
      >
        <Text className={large ? 'text-[16.5px]' : 'text-[15px]'} numberOfLines={1}>{value}</Text>
        <ChevronDown size={16} color="#97A4B8" />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        <View className="gap-2">
          {options.map((o) => (
            <Pressable
              key={o}
              onPress={() => { onChange(o); setOpen(false); }}
              className={`flex-row items-center justify-between rounded-xl border-[1.5px] px-3.5 py-3 ${o === value ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}
            >
              <Text className="font-inter-bold text-[14px] text-navy">{o}</Text>
              {o === value && <Check size={18} color="#1A73E8" strokeWidth={2.5} />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

// Six single-digit boxes that auto-advance, like the prototype's otpAdvance().
export function OtpInput({ value, onChange, large }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const setDigit = (i, raw) => {
    const d = raw.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join(''));
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  return (
    <View className="flex-row gap-2" style={{ direction: 'ltr' }}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => (refs.current[i] = r)}
          value={d}
          onChangeText={(v) => setDigit(i, v)}
          onKeyPress={(e) => onKey(i, e)}
          keyboardType="number-pad"
          maxLength={2}
          // Zero basis + minWidth 0: web inputs otherwise keep an intrinsic width and overflow the row.
          style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
          className={`rounded-[10px] border-2 border-field bg-input text-center font-inter-bold text-ink ${large ? 'py-3.5 text-[21.5px]' : 'py-3 text-[19.5px]'}`}
        />
      ))}
    </View>
  );
}

export const otpComplete = (v) => /^\d{6}$/.test(v);

export function PasswordField({ label, value, onChangeText, placeholder, required, error }) {
  const [hidden, setHidden] = useState(true);
  const Icon = hidden ? Eye : EyeOff;
  return (
    <View>
      <FieldLabel large required={required}>{label}</FieldLabel>
      <View className="justify-center">
        <Input large secureTextEntry={hidden} value={value} onChangeText={onChangeText} placeholder={placeholder} className="pr-11" />
        <Pressable onPress={() => setHidden(!hidden)} className="absolute right-3 p-1">
          <Icon size={18} color="#97A4B8" strokeWidth={1.8} />
        </Pressable>
      </View>
      {error ? <Text className="mt-1 text-[12px] text-danger">{error}</Text> : null}
    </View>
  );
}

// 3-step progress dots for the request form (step 3 = review).
export function StepWizard({ step }) {
  return (
    <View className="flex-row items-center gap-1.5 border-b border-line bg-white px-[18px] py-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className={`flex-row items-center gap-1.5 ${i < 3 ? 'flex-1' : ''}`}>
          <View className={`h-[26px] w-[26px] items-center justify-center rounded-full ${i < step ? 'bg-primary' : i === step ? 'bg-ink' : 'bg-line'}`}>
            <Text className={`font-inter-black text-[12.5px] ${i <= step ? 'text-white' : 'text-faint'}`}>{i < step ? '✓' : i}</Text>
          </View>
          {i < 3 && <View className={`h-0.5 flex-1 ${i < step ? 'bg-primary' : 'bg-line'}`} />}
        </View>
      ))}
    </View>
  );
}

export function ServiceTile({ img, title, sub, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[48%] overflow-hidden rounded-2xl border border-line bg-white active:opacity-85"
      style={{ shadowColor: '#0D2340', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}
    >
      <Image source={IMAGES[img]} style={{ width: '100%', height: 104, backgroundColor: '#C9D6EA' }} resizeMode="cover" />
      <View className="px-3 pb-3.5 pt-3">
        <Text className="font-inter-black text-[13.5px] leading-[17px] text-navy">{title}</Text>
        <Text className="mt-[3px] text-[11px] text-faint">{sub}</Text>
      </View>
    </Pressable>
  );
}

// Photo card with a dark gradient so white text stays legible (air options, care banner).
export function PhotoCard({ img, height, onPress, children, className = '' }) {
  return (
    <Pressable onPress={onPress} className={`overflow-hidden rounded-2xl active:opacity-90 ${className}`} style={{ height }}>
      <ImageBackground source={IMAGES[img]} resizeMode="cover" style={{ flex: 1 }}>
        <LinearGradient
          colors={['rgba(13,35,64,0.1)', 'rgba(13,35,64,0.3)', 'rgba(13,35,64,0.85)']}
          locations={[0, 0.5, 1]}
          style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
        >
          {children}
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

export function DocRow({ label, meta, onPress, className = '' }) {
  return (
    <Pressable onPress={onPress} className={`mb-2.5 flex-row items-center gap-2.5 rounded-[14px] border border-line bg-white p-3 active:opacity-80 ${className}`}>
      <View className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FDECEC]">
        <FileText size={16} color="#D64545" />
      </View>
      <View className="flex-1">
        <Text className="font-inter-bold text-[13.5px]">{label}</Text>
        <Text className="text-[11.5px] text-faint">{meta}</Text>
      </View>
      <Download size={15} color="#1A73E8" />
    </Pressable>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  const insets = useSafeAreaInsets();
  if (!toastMsg) return null;
  return (
    <View pointerEvents="none" className="absolute left-0 right-0 items-center" style={{ bottom: 90 + insets.bottom }}>
      <View className="rounded-full border border-[#223047] bg-ink px-[18px] py-2.5">
        <Text className="font-inter-semibold text-[13.5px] text-white">{toastMsg}</Text>
      </View>
    </View>
  );
}
