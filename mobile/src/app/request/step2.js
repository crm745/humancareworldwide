import { View } from 'react-native';
import { useApp } from '../../state/AppContext';
import { SOURCES, SOURCE_OTHER } from '../../data/mock';
import { RequestStep } from '../../components/RequestStep';
import { Field, FieldLabel, Input } from '../../components/ui';
import { Select } from '../../components/widgets';

// Step 2 of 3: additional information.
export default function RequestStep2() {
  const { t, draft, updateDraft } = useApp();
  return (
    <RequestStep step={2} headingKey="step3_heading">
      <Field multiline label={t('field_extra_info')} placeholder="Optional" value={draft.extra} onChangeText={(extra) => updateDraft({ extra })} />
      <Field multiline label={t('field_special_req')} placeholder="e.g. oxygen support, wheelchair access" value={draft.special} onChangeText={(special) => updateDraft({ special })} />
      <View>
        <FieldLabel>{t('field_hear_about_us')}</FieldLabel>
        <Select value={draft.source || 'Select an option'} options={SOURCES} onChange={(source) => updateDraft({ source })} title={t('field_hear_about_us')} />
        {draft.source === SOURCE_OTHER && (
          <Input
            className="mt-2.5"
            placeholder={t('field_hear_about_us_other')}
            value={draft.sourceOther}
            onChangeText={(sourceOther) => updateDraft({ sourceOther })}
          />
        )}
      </View>
    </RequestStep>
  );
}
