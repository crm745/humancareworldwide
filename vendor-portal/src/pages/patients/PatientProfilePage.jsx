import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, EyeOff, FileText, Mail, MessageCircle, MessageSquareText, Phone, Send, ShieldAlert } from 'lucide-react';

import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, InfoGrid } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageLoader } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FilePreviewModal } from '@/components/ui/FileUpload';
import { Alert, Avatar, PageHeader, Tabs } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/utils/format';
import { maskPhone } from '@/utils/mask';
import { cn } from '@/utils/cn';

const CONDITION_TONE = { Stable: 'green', Serious: 'orange', Critical: 'red' };
const CHANNEL_ICON = { Phone, Email: Mail, WhatsApp: MessageCircle, 'Portal Note': MessageSquareText };

function MedicalTab({ p }) {
  // Sensitive data is blurred until the user explicitly reveals it.
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <Alert
        tone="warning"
        title="Confidential medical information"
        action={
          <Button
            size="sm"
            variant="outline"
            leftIcon={revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? 'Hide' : 'Show details'}
          </Button>
        }
      >
        Access is logged. Share only with people directly involved in the patient’s care.
      </Alert>
      <div className={cn('mt-6 transition', !revealed && 'pointer-events-none select-none blur-sm')} aria-hidden={!revealed}>
        <InfoGrid
          items={[
            { label: 'Diagnosis', value: p.medical.diagnosis },
            {
              label: 'Condition',
              value: (
                <Badge tone={CONDITION_TONE[p.medical.condition]} dot>
                  {p.medical.condition}
                </Badge>
              ),
            },
            { label: 'Blood Group', value: p.medical.bloodGroup },
            { label: 'Allergies', value: p.medical.allergies },
            { label: 'Current Medications', value: p.medical.medications.join(', ') || '—' },
            { label: 'Mobility', value: p.medical.mobility },
            { label: 'Oxygen Required', value: p.medical.oxygenRequired ? 'Yes' : 'No' },
            { label: 'Attending Doctor', value: p.medical.attendingDoctor },
          ]}
        />
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Clinical notes</p>
          <p className="mt-1">{p.medical.notes || '—'}</p>
        </div>
      </div>
      {!revealed && (
        <p className="mt-3 text-center text-xs text-slate-500">Condition shown as: {p.medical.condition}. Click “Show details” to view the full record.</p>
      )}
    </div>
  );
}

function CommunicationTab({ p, onAdded }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('Portal Note');
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (text.trim().length < 3) return;
    setSaving(true);
    try {
      onAdded(await vendorService.addPatientNote(p.id, text.trim(), channel));
      setText('');
      toast.success('Note added');
    } finally {
      setSaving(false);
    }
  };
  const items = [...p.communications].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <div className="rounded-xl border border-slate-200 p-4">
        <Textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Log a call, email or note about this patient…"
          aria-label="New note"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Select
            aria-label="Channel"
            className="sm:w-44"
            options={['Portal Note', 'Phone', 'Email', 'WhatsApp']}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          />
          <Button leftIcon={<Send className="h-4 w-4" />} onClick={add} loading={saving} disabled={text.trim().length < 3}>
            Add to history
          </Button>
        </div>
      </div>
      <ol className="mt-6 space-y-5">
        {items.map((c) => {
          const Icon = CHANNEL_ICON[c.channel];
          return (
            <li key={c.id} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-800">{c.summary}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.channel} · {c.by} · {formatDateTime(c.date)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function PatientProfilePage() {
  const { patientId = '' } = useParams();
  useDocumentTitle('Patient Profile');
  const [tab, setTab] = useState('personal');
  const [preview, setPreview] = useState(null);
  const { data: p, loading, error, reload, setData } = useAsync(() => vendorService.getPatient(patientId), [patientId]);

  if (loading) return <PageLoader label="Loading patient…" />;
  if (error || !p) {
    return (
      <Card>
        {error?.includes('not found') ? (
          <EmptyState
            title="Patient not found"
            description="This patient record does not exist or you don’t have access to it."
            action={
              <Link to="/patients" className={buttonClasses()}>
                Back to patients
              </Link>
            }
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </Card>
    );
  }

  const tabs = [
    { key: 'personal', label: 'Personal Information' },
    { key: 'medical', label: 'Medical Information' },
    { key: 'travel', label: 'Travel Information' },
    { key: 'case', label: 'Case Information' },
    { key: 'documents', label: 'Documents', count: p.documents.length },
    { key: 'communication', label: 'Communication History', count: p.communications.length },
  ];

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Patients', to: '/patients' }, { label: p.name }]} title="Patient Profile" />

      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={p.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-slate-900">{p.name}</h2>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono">{p.id}</span> · {p.age} yrs · {p.gender} · {p.country}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/cases/${p.caseId}`} className={buttonClasses({ variant: 'outline' })}>
              View case {p.caseId.split('-').pop()}
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 pt-2">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
        </div>
        <div className="p-5 sm:p-6">
          {tab === 'personal' && (
            <InfoGrid
              cols={3}
              items={[
                { label: 'Full Name', value: p.name },
                { label: 'Date of Birth', value: formatDate(p.dateOfBirth) },
                { label: 'Age / Gender', value: `${p.age} · ${p.gender}` },
                { label: 'Nationality', value: p.nationality },
                { label: 'Country of Residence', value: p.country },
                { label: 'Passport', value: p.passportLast4 ? `XXXXX${p.passportLast4}` : '—' },
                { label: 'Phone', value: maskPhone(p.phone) },
                { label: 'Email', value: p.email },
                { label: 'Emergency Contact', value: `${p.emergencyContact.name} (${p.emergencyContact.relation}) · ${maskPhone(p.emergencyContact.phone)}` },
              ]}
            />
          )}
          {tab === 'medical' && <MedicalTab p={p} />}
          {tab === 'travel' && (
            <InfoGrid
              items={[
                { label: 'From', value: p.travel.from },
                { label: 'To', value: p.travel.to },
                { label: 'Mode', value: p.travel.mode },
                { label: 'Travel Date', value: formatDateTime(p.travel.travelDate) },
                { label: 'Medical Escort', value: p.travel.escort },
                { label: 'Equipment', value: p.travel.equipment.join(', ') || '—' },
              ]}
            />
          )}
          {tab === 'case' && (
            <div>
              <InfoGrid
                cols={3}
                items={[
                  { label: 'Case ID', value: <span className="font-mono">{p.caseId}</span> },
                  { label: 'Service', value: p.service },
                  { label: 'Status', value: <StatusBadge status={p.status} /> },
                ]}
              />
              <Link to={`/cases/${p.caseId}`} className={buttonClasses({ variant: 'secondary', className: 'mt-6' })}>
                Open full case
              </Link>
            </div>
          )}
          {tab === 'documents' &&
            (p.documents.length ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {p.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        {d.type} · {formatDate(d.date)}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                    <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setPreview(d.name)}>
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileText} title="No documents" description="Medical documents shared for this patient will appear here." />
            ))}
          {tab === 'communication' && <CommunicationTab p={p} onAdded={(e) => setData((prev) => ({ ...prev, communications: [...prev.communications, e] }))} />}
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldAlert className="h-3.5 w-3.5" /> Patient data is protected under HumanCare’s data-privacy policy.
      </div>
      <FilePreviewModal open={!!preview} onClose={() => setPreview(null)} name={preview ?? ''} type="application/pdf" />
    </div>
  );
}
