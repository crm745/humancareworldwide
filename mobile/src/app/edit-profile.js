import { useState } from 'react';
import { View } from 'react-native';
import { initialsOf, useApp } from '../state/AppContext';
import { COUNTRY_CODES, COUNTRY_CODE_LABELS } from '../data/mock';
import { goBack } from '../lib/nav';
import { apiPatch } from '../lib/api';
import { isValidEmail, isValidName, isValidPhoneForCountry } from '../lib/validators';
import { BackButton, Body, Screen } from '../components/layout';
import { Button, Field, FieldLabel, Heading, Input, Spacer, Text } from '../components/ui';
import { Select } from '../components/widgets';

export default function EditProfile() {
  const { t, toast, profile, setProfile } = useApp();
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const ready = isValidName(form.name) && isValidPhoneForCountry(form.phone, form.cc) && isValidEmail(form.email);

  const save = async () => {
    if (!ready) { toast('Enter a valid name, mobile number, and email.'); return; }
    setBusy(true);
    try {
      await apiPatch('/auth/me', { name: form.name.trim(), mobile: form.phone.trim(), email: form.email.trim(), countryCode: form.cc });
      setProfile({ name: form.name.trim(), cc: form.cc, phone: form.phone.trim(), email: form.email.trim() });
      toast('Profile updated');
      goBack();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
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
          <Field
            large required label={t('field_full_name')} value={form.name} onChangeText={(name) => set({ name })}
            error={form.name && !isValidName(form.name) ? 'Enter a valid name.' : undefined}
          />
          <View>
            <FieldLabel large required>{t('field_mobile_number')}</FieldLabel>
            <View className="flex-row gap-2">
              <Select large value={form.cc} options={COUNTRY_CODES} labels={COUNTRY_CODE_LABELS} onChange={(cc) => set({ cc })} title={t('field_mobile_number')} className="w-28" />
              <Input large className="flex-1" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => set({ phone })} />
            </View>
            {form.phone && !isValidPhoneForCountry(form.phone, form.cc) ? <Text className="mt-1 text-[12px] text-danger">Enter a valid mobile number for the selected country.</Text> : null}
          </View>
          <Field
            large required label={t('field_email_address')} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(email) => set({ email })}
            error={form.email && !isValidEmail(form.email) ? 'Enter a valid email address.' : undefined}
          />
        </View>
        <Spacer />
        <Button large title={t('btn_save_changes')} dimmed={!ready} loading={busy} onPress={save} />
      </Body>
    </Screen>
  );
}
