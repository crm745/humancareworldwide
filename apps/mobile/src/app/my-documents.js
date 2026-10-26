import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { apiGet } from '../lib/api';
import { downloadAndShare } from '../lib/download';
import { Body, Screen, TopBar } from '../components/layout';
import { Text } from '../components/ui';
import { DocRow } from '../components/widgets';
import { LoadingState } from '../components/LoadingState';

export default function MyDocuments() {
  const { t, toast } = useApp();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/requests/me/documents')
      .then(({ documents }) => setDocs(documents))
      .catch((err) => toast(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  return (
    <Screen>
      <TopBar title={t('my_documents')} />
      <Body contentClassName="p-[18px]">
        <Text className="mb-2.5 font-inter-black text-[12px] uppercase tracking-wide text-faint">{t('lbl_medical_records')}</Text>
        {loading && <LoadingState />}
        {!loading && docs.length === 0 && <Text className="py-6 text-center text-[13px] text-faint">No documents uploaded yet.</Text>}
        {docs.map((d) => (
          <DocRow
            key={d.id}
            label={d.name}
            meta={`${d.case?.referenceNumber || ''}${d.fileSizeBytes ? ` · ${Math.round(d.fileSizeBytes / 1024)} KB` : ''}`}
            onPress={() => downloadAndShare(`/documents/${d.id}/file`, d.name).catch((err) => toast(err.message))}
          />
        ))}
      </Body>
    </Screen>
  );
}
