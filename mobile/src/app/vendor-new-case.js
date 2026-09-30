import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { VENDOR_IDENTITY } from '../data/mock';
import { navReplace } from '../lib/nav';
import { Body, Screen, TopBar } from '../components/layout';
import { Button, CareLevelGrid, Field, FieldLabel, Spacer, Text } from '../components/ui';
import { Select } from '../components/widgets';

const SERVICE_TYPES = ['Air Ambulance', 'Ground Ambulance', 'Hospitalization', 'Medical Escort', 'Mortal Remains', 'Home Healthcare', 'Teleconsultation', 'Corporate Medical'];
// Care Level is only asked for patient transport.
const CARE_LEVEL_TYPES = ['Air Ambulance', 'Ground Ambulance'];

export default function VendorNewCase() {
  const { t, toast } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', service: SERVICE_TYPES[0], origin: '', dest: '', policy: '', care: ['care_stable'], notes: '' });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const ready = form.name && form.phone;

  const submit = () => {
    if (!ready) return;
    toast('Case created and synced to Bitrix24.');
    navReplace('/vendor-dashboard');
  };

  return (
    <Screen>
      <TopBar title={t('new_corporate_case_title')} />
      <Body contentClassName="p-[18px]">
        <Text className="mb-4 text-[13px] text-faint">
          {t('submitting_under_prefix')} <Text className="font-inter-bold text-primary">{VENDOR_IDENTITY.name}</Text>
        </Text>
        <View className="gap-3.5">
          <Field label={t('field_patient_name')} placeholder="Full legal name" value={form.name} onChangeText={(name) => set({ name })} />
          <Field label={t('field_patient_contact_number')} placeholder="+91 98765 43210" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => set({ phone })} />
          <View>
            <FieldLabel>{t('field_service_type')}</FieldLabel>
            <Select value={form.service} options={SERVICE_TYPES} onChange={(service) => set({ service })} title={t('field_service_type')} />
          </View>
          <View className="flex-row gap-2.5">
            <Field className="flex-1" label={t('field_origin')} placeholder="City / Airport" value={form.origin} onChangeText={(origin) => set({ origin })} />
            <Field className="flex-1" label={t('field_destination')} placeholder="City / Hospital" value={form.dest} onChangeText={(dest) => set({ dest })} />
          </View>
          <Field label={t('field_policy_gop_ref')} placeholder="e.g. BUPA-GOP-58213" autoCapitalize="characters" value={form.policy} onChangeText={(policy) => set({ policy })} />
          {CARE_LEVEL_TYPES.includes(form.service) && (
            <View>
              <FieldLabel>{t('field_care_level')}</FieldLabel>
              <Text className="mb-2 text-[11.5px] text-faint">{t('care_level_hint')}</Text>
              <CareLevelGrid value={form.care} onChange={(care) => set({ care })} />
            </View>
          )}
          <Field multiline label={t('field_case_notes')} placeholder="Clinical summary, special requirements..." value={form.notes} onChangeText={(notes) => set({ notes })} />
        </View>
        <Spacer />
        <Button title={t('btn_create_case')} dimmed={!ready} onPress={submit} className="mt-6" />
      </Body>
    </Screen>
  );
}
