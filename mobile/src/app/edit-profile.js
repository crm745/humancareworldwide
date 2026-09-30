import { useState } from 'react';
import { View } from 'react-native';
import { initialsOf, useApp } from '../state/AppContext';
import { COUNTRY_CODES } from '../data/mock';
import { goBack } from '../lib/nav';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Field, FieldLabel, Heading, Input, Spacer, Text } from '../components/ui';
import { Select } from '../components/widgets';

export default function EditProfile() {
  const { t, toast, profile, setProfile } = useApp();
  const [form, setForm] = useState(profile);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const ready = form.name.trim() && form.phone.trim() && form.email.trim();

  const save = () => {
    if (!ready) return;
    setProfile({ name: form.name.trim(), cc: form.cc, phone: form.phone.trim(), email: form.email.trim() });
    toast('Profile updated');
    goBack();
  };

  return (
    <Screen bg="bg-white">
      <View className="px-[26px] pt-[26px]"><BackButton /></View>
      <Body contentClassName="px-[26px] pb-[26px] pt-5">
        <Heading className="text-center text-[23.5px]">{t('edit_profile_title')}</Heading>
        <Text className="mb-[26px] mt-2.5 text-center text-[14.5px] text-muted">{t('edit_profile_sub')}</Text>
        <View className="mb-[26px] items-center">
          <View className="h-16 w-16 items-center justify-center rounded-[18px] bg-primary-soft">
            <Text className="font-inter-black text-[21px] text-primary">{initialsOf(form.name)}</Text>
          </View>
        </View>
        <View className="gap-[18px]">
          <Field large label={t('field_full_name')} value={form.name} onChangeText={(name) => set({ name })} />
          <View>
            <FieldLabel large>{t('field_mobile_number')}</FieldLabel>
            <View className="flex-row gap-2">
              <Select large value={form.cc} options={COUNTRY_CODES} onChange={(cc) => set({ cc })} title={t('field_mobile_number')} className="w-[84px]" />
              <Input large className="flex-1" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => set({ phone })} />
            </View>
          </View>
          <Field large label={t('field_email_address')} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => set({ email })} />
        </View>
        <Spacer />
        <Button large title={t('btn_save_changes')} dimmed={!ready} onPress={save} />
      </Body>
    </Screen>
  );
}
