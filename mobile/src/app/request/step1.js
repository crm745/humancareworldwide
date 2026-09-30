import { Pressable, View } from 'react-native';
import { Check, FileText, Upload } from 'lucide-react-native';
import { needsCareLevel, useApp } from '../../state/AppContext';
import { COUNTRY_CODES } from '../../data/mock';
import { RequestStep } from '../../components/RequestStep';
import { CareLevelGrid, Field, FieldLabel, Input, Text } from '../../components/ui';
import { Select } from '../../components/widgets';

function SectionHeading({ children, first }) {
  return <Text className={`font-inter-black text-[17px] text-navy ${first ? '' : 'mt-3'}`}>{children}</Text>;
}

// Mock upload: tapping toggles a fake medical_report.pdf, as in the prototype.
// Swap for expo-document-picker when wiring to the backend's upload endpoint.
function UploadBox({ uploaded, onToggle }) {
  const { t } = useApp();
  if (uploaded) {
    return (
      <Pressable onPress={onToggle} className="flex-row items-center gap-2.5 rounded-[14px] border border-line bg-white p-3">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FDECEC]"><FileText size={16} color="#D64545" /></View>
        <View className="min-w-0 flex-1">
          <Text className="font-inter-bold text-[14px]" numberOfLines={1}>medical_report.pdf</Text>
          <Text className="text-[11.5px] text-faint">Tap to remove</Text>
        </View>
        <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-primary"><Check size={12} color="#fff" strokeWidth={3} /></View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onToggle} className="items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#C7D3E5] bg-input px-4 py-5">
      <Upload size={20} color="#1A73E8" />
      <Text className="font-inter-bold text-[13.5px] text-primary">{t('upload_file_btn')}</Text>
      <Text className="text-[11.5px] text-faint">{t('upload_hint')}</Text>
    </Pressable>
  );
}

// Step 1 of 3: patient details and request details on one page.
export default function RequestStep1() {
  const { t, draft, updateDraft } = useApp();
  return (
    <RequestStep step={1}>
      <SectionHeading first>{t('step1_heading')}</SectionHeading>
      <Field label={t('field_patient_name')} value={draft.name} onChangeText={(name) => updateDraft({ name })} />
      <View className="flex-row gap-2.5">
        <Field className="flex-1" label={t('field_age')} keyboardType="number-pad" value={draft.age} onChangeText={(age) => updateDraft({ age })} />
        <View className="flex-1">
          <FieldLabel>{t('field_gender')}</FieldLabel>
          <Select value={draft.gender} options={['Male', 'Female', 'Other']} onChange={(gender) => updateDraft({ gender })} title={t('field_gender')} />
        </View>
      </View>
      <Field label={t('field_location')} value={draft.location} onChangeText={(location) => updateDraft({ location })} />
      <View>
        <FieldLabel>{t('field_contact_number')}</FieldLabel>
        <View className="flex-row gap-2">
          <Select value={draft.cc} options={COUNTRY_CODES} onChange={(cc) => updateDraft({ cc })} title={t('field_contact_number')} className="w-20" />
          <Input className="flex-1" placeholder="Enter number" keyboardType="phone-pad" value={draft.phone} onChangeText={(phone) => updateDraft({ phone })} />
        </View>
      </View>
      {needsCareLevel(draft.service) && (
        <View>
          <FieldLabel>{t('field_care_level')}</FieldLabel>
          <Text className="mb-2.5 text-[11.5px] text-faint">{t('care_level_hint')}</Text>
          <CareLevelGrid value={draft.care} onChange={(care) => updateDraft({ care })} />
        </View>
      )}

      <SectionHeading>{t('step2_heading')}</SectionHeading>
      <Field multiline label={t('field_requirement_desc')} placeholder="e.g. Patient needs a stable transfer to a cardiac hospital" value={draft.desc} onChangeText={(desc) => updateDraft({ desc })} />
      <Field label={t('field_destination')} placeholder="City, Country" value={draft.dest} onChangeText={(dest) => updateDraft({ dest })} />
      <Field label={t('field_preferred_date')} placeholder="YYYY-MM-DD" value={draft.date} onChangeText={(date) => updateDraft({ date })} />
      <View>
        <FieldLabel>{t('field_upload_report')}</FieldLabel>
        <UploadBox uploaded={draft.uploaded} onToggle={() => updateDraft({ uploaded: !draft.uploaded })} />
      </View>
    </RequestStep>
  );
}
