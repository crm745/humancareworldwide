import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, EyeOff, FileText, Mail, MessageCircle, Phone, Send, ShieldAlert, Upload } from 'lucide-react';

import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader, InfoGrid } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FilePreviewModal } from '@/components/ui/FileUpload';
import { Alert, Avatar, PageHeader, Tabs } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { AddCaseDocumentModal } from '@/components/forms/AddCaseDocumentModal';
import { formatDate, formatDateTime } from '@/utils/format';
import { maskPhone } from '@/utils/mask';
import { cn } from '@/utils/cn';

const CONDITION_TONE = { Stable: 'green', Serious: 'orange', Critical: 'red' };
const CHANNEL_ICON = { Phone, Email: Mail, WhatsApp: MessageCircle };

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

// The backend still stores a "channel" per note (Phone/Email/WhatsApp/...), but the
// dropdown to pick one was removed for simplicity — every note added from here is
// just tagged 'Note'.
const NOTE_CHANNEL = 'Note';

function CommunicationTab({ p, onAdded }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (text.trim().length < 3) return;
    setSaving(true);
    try {
      onAdded(await corporateService.addPatientNote(p.id, text.trim(), NOTE_CHANNEL));
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
          placeholder="Note about this patient…"
          aria-label="New note"
        />
        <div className="mt-3 flex justify-end">
          <Button leftIcon={<Send className="h-4 w-4" />} onClick={add} loading={saving} disabled={text.trim().length < 3}>
            Add Note
          </Button>
        </div>
      </div>
      <ol className="mt-6 space-y-5">
        {items.map((c) => {
          // Falls back to a generic icon for a channel value saved before 'Portal
          // Note' was removed from the dropdown (or any future unrecognized value).
          const Icon = CHANNEL_ICON[c.channel] || MessageCircle;
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
  const [tab, setTab] = useState('documents');
  const [preview, setPreview] = useState(null);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [file, setFile] = useState({ url: null, type: '', loading: false });
  const { data: p, loading, error, reload, setData } = useAsync(() => corporateService.getPatient(patientId), [patientId]);

  // Fetches the actual file (as a blob, since the download route needs auth headers a
  // plain <img>/<iframe> src can't send) whenever a document is opened for preview, and
  // revokes the object URL again on close/unmount so it doesn't leak memory.
  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    let objectUrl = null;
    setFile({ url: null, type: '', loading: true });
    corporateService
      .getCaseDocumentFile(preview.id)
      .then((res) => {
        if (cancelled) return;
        objectUrl = res?.url ?? null;
        setFile({ url: objectUrl, type: res?.type || '', loading: false });
      })
      .catch(() => {
        if (!cancelled) setFile({ url: null, type: '', loading: false });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [preview]);

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

  // Medical Information and Travel Information are left out entirely — nothing in the
  // current data model collects diagnosis, blood group, travel mode, etc., so there's
  // nothing real to show there (see toPortalPatientDetail() in corporateService.js).
  // Personal/Case Information are short enough now to show as stacked sections instead
  // of tabs; Documents and Communication History stay as tabs since those are lists
  // that can grow long.
  const tabs = [
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
              <span className="font-mono">{p.id}</span>
              {p.age ? ` · ${p.age} yrs` : ''}
              {p.gender ? ` · ${p.gender}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/cases/${p.caseId}`} className={buttonClasses({ variant: 'outline' })}>
              View case {p.caseId.split('-').pop()}
            </Link>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Personal Information" />
        <div className="p-5 sm:p-6">
          <InfoGrid
            cols={3}
            items={[
              { label: 'Full Name', value: p.name },
              { label: 'Age / Gender', value: p.age || p.gender ? `${p.age || '—'} · ${p.gender || '—'}` : '—' },
              { label: 'Phone', value: maskPhone(p.phone) },
            ]}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Case Information" />
        <div className="p-5 sm:p-6">
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
      </Card>

      <Card>
        <div className="px-5 pt-2">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
        </div>
        <div className="p-5 sm:p-6">
          {tab === 'documents' && (
            <div>
              <div className="mb-4 flex justify-end">
                <Button size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => setAddDocOpen(true)}>
                  Add Document
                </Button>
              </div>
              {p.documents.length ? (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {p.documents.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-500">
                          {d.type} · {d.fileExt} · {formatDate(d.date)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setPreview(d)}>
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FileText} title="No documents" description="Medical documents shared for this patient will appear here." />
              )}
            </div>
          )}
          {tab === 'communication' && <CommunicationTab p={p} onAdded={(e) => setData((prev) => ({ ...prev, communications: [...prev.communications, e] }))} />}
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldAlert className="h-3.5 w-3.5" /> Patient data is protected under HumanCare’s data-privacy policy.
      </div>
      <FilePreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        name={preview?.name ?? ''}
        type={file.type}
        url={file.url}
        loading={file.loading}
      />
      <AddCaseDocumentModal
        open={addDocOpen}
        onClose={() => setAddDocOpen(false)}
        caseId={p.caseId}
        onAdded={(doc) => setData((prev) => ({ ...prev, documents: [doc, ...prev.documents] }))}
      />
    </div>
  );
}
