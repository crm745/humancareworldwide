import { Fragment } from 'react';
import { useApp } from '../state/AppContext';
import { MY_DOCUMENTS } from '../data/mock';
import { Body, Screen, TopBar } from '../components/layout';
import { Text } from '../components/ui';
import { DocRow } from '../components/widgets';

export default function MyDocuments() {
  const { t, toast } = useApp();
  return (
    <Screen>
      <TopBar title={t('my_documents')} />
      <Body contentClassName="p-[18px]">
        {MY_DOCUMENTS.map((group, i) => (
          <Fragment key={group.section}>
            <Text className={`mb-2.5 font-inter-black text-[12px] uppercase tracking-wide text-faint ${i > 0 ? 'mt-3' : ''}`}>{t(group.section)}</Text>
            {group.docs.map((d) => <DocRow key={d.label} label={t(d.label)} meta={d.meta} onPress={() => toast(d.toast)} />)}
          </Fragment>
        ))}
      </Body>
    </Screen>
  );
}
