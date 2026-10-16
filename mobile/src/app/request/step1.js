import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Check, FileText, Upload } from 'lucide-react-native';
import { needsCareLevel, useApp } from '../../state/AppContext';
import { COUNTRY_CODES } from '../../data/mock';
import { isValidAge, isValidDateString, isValidName, isValidPhoneForCountry } from '../../lib/validators';
import { RequestStep } from '../../components/RequestStep';
import { CareLevelGrid, Field, FieldLabel, Input, Text } from '../../components/ui';
import { Select, Sheet } from '../../components/widgets';

function dateStringToObj(value) {
  if (value && isValidDateString(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}
function dateObjToString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// A transfer can't be scheduled for a date that's already passed.
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// Replaces free-typed "YYYY-MM-DD" (easy to fumble mid-emergency — "20/11/2026"
// trips the validator) with a native calendar. Android shows its own picker dialog
// on demand; iOS has no built-in dialog chrome for the spinner, so that one is
// wrapped in the existing Sheet component with a Done button.
function DateField({ label, required, value, onChange, error }) {
  const [open, setOpen] = useState(false);

  const handleAndroidChange = (event, selected) => {
    setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(dateObjToString(selected));
  };

  return (
    <View>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between gap-1 rounded-[10px] border-[1.5px] border-field bg-input px-3 py-3"
      >
        <Text className={`text-[15px] ${value ? 'text-ink' : 'text-faint'}`}>{value || 'Select a date'}</Text>
        <Calendar size={16} color="#97A4B8" />
      </Pressable>
      {error ? <Text className="mt-1 text-[12px] text-danger">{error}</Text> : null}

      {Platform.OS === 'android' && open && (
        <DateTimePicker value={dateStringToObj(value)} mode="date" minimumDate={TODAY} onChange={handleAndroidChange} />
      )}

      {Platform.OS !== 'android' && (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
          <DateTimePicker
            value={dateStringToObj(value)}
            mode="date"
            display="spinner"
            minimumDate={TODAY}
            onChange={(_event, selected) => selected && onChange(dateObjToString(selected))}
          />
          <Pressable onPress={() => setOpen(false)} className="mt-4 items-center rounded-xl bg-primary py-3.5">
            <Text className="font-inter-bold text-[15px] text-white">Done</Text>
          </Pressable>
        </Sheet>
      )}
    </View>
  );
}

function SectionHeading({ children, first }) {
  return <Text className={`font-inter-black text-[17px] text-navy ${first ? '' : 'mt-3'}`}>{children}</Text>;
}

// Matches the backend's allowed types (see backend/src/middleware/upload.middleware.js).
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function UploadBox({ file, onPick, onRemove }) {
  const { t, toast } = useApp();

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_MIME_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) { toast('File is too large — max 10MB.'); return; }
    onPick({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
  };

  if (file) {
    return (
      <Pressable onPress={onRemove} className="flex-row items-center gap-2.5 rounded-[14px] border border-line bg-white p-3">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FDECEC]"><FileText size={16} color="#D64545" /></View>
        <View className="min-w-0 flex-1">
          <Text className="font-inter-bold text-[14px]" numberOfLines={1}>{file.name}</Text>
          <Text className="text-[11.5px] text-faint">Tap to remove</Text>
        </View>
        <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-primary"><Check size={12} color="#fff" strokeWidth={3} /></View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={pick} className="items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#C7D3E5] bg-input px-4 py-5">
      <Upload size={20} color="#1A73E8" />
      <Text className="font-inter-bold text-[13.5px] text-primary">{t('upload_file_btn')}</Text>
      <Text className="text-[11.5px] text-faint">{t('upload_hint')}</Text>
    </Pressable>
  );
}

// Step 1 of 3: patient details and request details on one page.
export default function RequestStep1() {
  const { t, draft, updateDraft } = useApp();
  const careOk = !needsCareLevel(draft.service) || draft.care.length > 0;
  const ready = isValidName(draft.name) && isValidAge(draft.age) && draft.location.trim()
    && (!draft.phone || isValidPhoneForCountry(draft.phone, draft.cc)) && careOk
    && draft.dest.trim() && isValidDateString(draft.date);
  // Flips true the first time Next is tapped while something required is still
  // blank — before that, an untouched required field shows no error (nobody wants
  // red borders on a form they haven't started filling in yet).
  const [attempted, setAttempted] = useState(false);

  return (
    <RequestStep step={1} ready={ready} onInvalidNext={() => setAttempted(true)}>
      <SectionHeading first>{t('step1_heading')}</SectionHeading>
      <Field
        required label={t('field_patient_name')} value={draft.name} onChangeText={(name) => updateDraft({ name })}
        error={(attempted || draft.name) && !isValidName(draft.name) ? 'Enter a valid name.' : undefined}
      />
      <View className="flex-row gap-2.5">
        <Field
          className="flex-1" label={t('field_age')} keyboardType="number-pad" value={draft.age} onChangeText={(age) => updateDraft({ age })}
          error={draft.age && !isValidAge(draft.age) ? 'Enter a valid age.' : undefined}
        />
        <View className="flex-1">
          <FieldLabel>{t('field_gender')}</FieldLabel>
          <Select value={draft.gender} options={['Male', 'Female', 'Other']} onChange={(gender) => updateDraft({ gender })} title={t('field_gender')} />
        </View>
      </View>
      <Field
        required label={t('field_location')} value={draft.location} onChangeText={(location) => updateDraft({ location })}
        error={attempted && !draft.location.trim() ? 'This field is required.' : undefined}
      />
      <View>
        <FieldLabel>{t('field_contact_number')}</FieldLabel>
        <View className="flex-row gap-2">
          <Select value={draft.cc} options={COUNTRY_CODES} onChange={(cc) => updateDraft({ cc })} title={t('field_contact_number')} className="w-20" />
          <Input className="flex-1" placeholder="Enter number" keyboardType="phone-pad" value={draft.phone} onChangeText={(phone) => updateDraft({ phone })} />
        </View>
        {draft.phone && !isValidPhoneForCountry(draft.phone, draft.cc) ? <Text className="mt-1 text-[12px] text-danger">Enter a valid number for the selected country.</Text> : null}
      </View>
      {needsCareLevel(draft.service) && (
        <View>
          <FieldLabel required>{t('field_care_level')}</FieldLabel>
          <Text className="mb-2.5 text-[11.5px] text-faint">{t('care_level_hint')}</Text>
          <CareLevelGrid value={draft.care} onChange={(care) => updateDraft({ care })} />
          {!careOk ? <Text className="mt-1 text-[12px] text-danger">Select at least one option.</Text> : null}
        </View>
      )}

      <SectionHeading>{t('step2_heading')}</SectionHeading>
      <Field multiline label={t('field_requirement_desc')} placeholder="e.g. Patient needs a stable transfer to a cardiac hospital" value={draft.desc} onChangeText={(desc) => updateDraft({ desc })} />
      <Field
        required label={t('field_destination')} placeholder="City, Country" value={draft.dest} onChangeText={(dest) => updateDraft({ dest })}
        error={attempted && !draft.dest.trim() ? 'This field is required.' : undefined}
      />
      <DateField
        required label={t('field_preferred_date')} value={draft.date} onChange={(date) => updateDraft({ date })}
        error={(attempted || draft.date) && !isValidDateString(draft.date) ? 'Enter a valid date.' : undefined}
      />
      <View>
        <FieldLabel>{t('field_upload_report')}</FieldLabel>
        <UploadBox file={draft.uploadedFile} onPick={(uploadedFile) => updateDraft({ uploadedFile })} onRemove={() => updateDraft({ uploadedFile: null })} />
      </View>
    </RequestStep>
  );
}
