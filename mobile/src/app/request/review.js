import { useState } from 'react';
import { View } from 'react-native';
import { needsCareLevel, useApp } from '../../state/AppContext';
import SERVICES from '../../data/services.json';
import { SOURCE_OTHER } from '../../data/mock';
import { navReplace } from '../../lib/nav';
import { apiPost, apiUpload } from '../../lib/api';
import { Body, Screen, TopBar } from '../../components/layout';
import { Button, Card, InfoRow, SectionLabel, Text } from '../../components/ui';
import { StepWizard } from '../../components/widgets';

// Shown while the medical-report attachment is uploading — without this, a big PDF
// on a slow connection is 10-15s of total silence that reads as a frozen app.
function UploadProgressBar({ progress }) {
  const pct = Math.round(progress * 100);
  return (
    <View className="mt-3">
      <View className="h-2 overflow-hidden rounded-full bg-line">
        <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-1.5 text-center text-[12.5px] text-faint">Uploading medical report… {pct}%</Text>
    </View>
  );
}

function Section({ title, rows, className = '' }) {
  return (
    <Card className={className}>
      <SectionLabel>{title}</SectionLabel>
      {rows.map(([label, value], i) => <InfoRow key={label} label={label} value={value || '—'} last={i === rows.length - 1} />)}
    </Card>
  );
}

// Step 3 of 3: review everything, then submit.
export default function RequestReview() {
  const { t, draft: d, toast } = useApp();
  const [busy, setBusy] = useState(false);
  // null while not uploading, 0–1 once the attachment upload starts.
  const [uploadProgress, setUploadProgress] = useState(null);
  const source = d.source === SOURCE_OTHER && d.sourceOther.trim() ? `${SOURCE_OTHER}: ${d.sourceOther.trim()}` : d.source;
  const serviceTitle = (SERVICES[d.service] || SERVICES.air).title;

  const submit = async () => {
    setBusy(true);
    try {
      const { request } = await apiPost('/requests', {
        serviceType: serviceTitle,
        patientName: d.name,
        patientAge: d.age || undefined,
        patientGender: d.gender,
        patientLocation: d.location,
        patientContact: d.phone ? `${d.cc} ${d.phone}` : undefined,
        origin: d.location,
        destination: d.dest,
        preferredDate: d.date || undefined,
        careLevel: needsCareLevel(d.service) ? d.care.join(', ') : undefined,
        description: d.desc || undefined,
        specialRequirements: d.special || undefined,
        referralSource: source || undefined,
      });

      if (d.uploadedFile) {
        setUploadProgress(0);
        try {
          await apiUpload(`/requests/me/${request.id}/documents`, d.uploadedFile, false, setUploadProgress);
        } catch (err) {
          // Request is already saved at this point — a failed attachment shouldn't block it.
          toast(`Request submitted, but the attachment failed to upload: ${err.message}`);
        } finally {
          setUploadProgress(null);
        }
      }

      navReplace({ pathname: '/request/submitted', params: { id: request.referenceNumber, requestId: request.id, service: serviceTitle } });
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <TopBar title={t('review_title')} />
      <StepWizard step={3} />
      <Body contentClassName="p-[18px]">
        <Text className="mb-3.5 text-center text-[13.5px] text-muted">{t('review_sub')}</Text>
        <Section
          title={t('step1_heading')}
          rows={[
            [t('lbl_name'), d.name],
            [t('lbl_age_gender'), `${d.age || '—'} Y / ${d.gender}`],
            [t('lbl_location'), d.location],
            [t('field_contact_number'), d.phone && `${d.cc} ${d.phone}`],
            ...(needsCareLevel(d.service) ? [[t('field_care_level'), d.care.map(t).join(', ')]] : []),
          ]}
        />
        <Section
          className="mt-3"
          title={t('lbl_request_details')}
          rows={[
            [t('lbl_service'), (SERVICES[d.service] || SERVICES.air).title],
            [t('lbl_requirement'), d.desc],
            [t('field_destination'), d.dest],
            [t('field_preferred_date'), d.date],
            [t('lbl_medical_report'), d.uploadedFile ? d.uploadedFile.name : 'Not attached'],
          ]}
        />
        <Section
          className="mt-3"
          title={t('step3_heading')}
          rows={[
            [t('lbl_extra_info'), d.extra],
            [t('lbl_special_requirements'), d.special],
            [t('lbl_heard_about_us'), source],
          ]}
        />
        <Button title={t('submit_request_btn')} onPress={submit} dimmed={busy} loading={busy} className="mt-5" />
        {uploadProgress !== null && <UploadProgressBar progress={uploadProgress} />}
      </Body>
    </Screen>
  );
}
