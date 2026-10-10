import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Download, Eye, FileText, RefreshCw, Trash2, Upload, XCircle } from 'lucide-react';
import type { VendorDocument } from '@/types';
import { DOCUMENT_TYPES } from '@/data/constants';
import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, RowAction, type Column } from '@/components/ui/Table';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FilePreviewModal, FileUpload, type UploadedFile } from '@/components/ui/FileUpload';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { downloadFile } from '@/utils/download';
import { daysUntil, formatBytes, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const SUMMARY = [
  { status: 'Verified', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
  { status: 'Pending', icon: Clock3, tone: 'text-amber-600 bg-amber-50' },
  { status: 'Expired', icon: AlertTriangle, tone: 'text-orange-600 bg-orange-50' },
  { status: 'Rejected', icon: XCircle, tone: 'text-red-600 bg-red-50' },
] as const;

function UploadDocumentModal({ open, replacing, onClose, onUploaded }: { open: boolean; replacing: VendorDocument | null; onClose: () => void; onUploaded: (d: VendorDocument, file: UploadedFile) => void }) {
  const toast = useToast();
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset / prefill each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setType(replacing?.type ?? '');
    setName(replacing?.name ?? '');
    setExpiry('');
    setFile(null);
    setAttempted(false);
  }, [open, replacing]);

  const errors = {
    type: !type ? 'Select a document type' : '',
    name: name.trim().length < 3 ? 'Enter a document name (min 3 characters)' : '',
    expiry: expiry && daysUntil(expiry) < 0 ? 'Expiry date cannot be in the past' : '',
    file: !file ? 'Upload the document file' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = async () => {
    setAttempted(true);
    if (!valid || !file) return;
    setSaving(true);
    try {
      const doc = await vendorService.uploadDocument({ name: name.trim(), type, fileName: file.name, size: file.size, expiryDate: expiry ? new Date(expiry).toISOString() : null }, replacing?.id);
      onUploaded(doc, file);
      toast.success(replacing ? 'Document replaced' : 'Document uploaded', 'It is now pending verification by HumanCare compliance.');
      onClose();
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={replacing ? `Replace “${replacing.name}”` : 'Upload document'}
      description="Accepted formats: PDF, JPG, PNG — maximum 5 MB."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} leftIcon={<Upload className="h-4 w-4" />}>
            Upload
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Document Type" required error={attempted ? errors.type : ''} htmlFor="doc-type">
          <Select id="doc-type" placeholder="Select type" options={DOCUMENT_TYPES} value={type} onChange={(e) => setType(e.target.value)} invalid={attempted && !!errors.type} />
        </Field>
        <Field label="Expiry Date" error={attempted ? errors.expiry : ''} hint="Leave blank if it doesn’t expire" htmlFor="doc-expiry">
          <Input id="doc-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} invalid={attempted && !!errors.expiry} />
        </Field>
        <Field label="Document Name" required error={attempted ? errors.name : ''} htmlFor="doc-name" className="sm:col-span-2">
          <Input id="doc-name" placeholder="e.g. Trade Licence 2026" value={name} onChange={(e) => setName(e.target.value)} invalid={attempted && !!errors.name} />
        </Field>
        <div className="sm:col-span-2">
          <FileUpload label="File" required value={file} onChange={setFile} error={attempted ? errors.file : undefined} disabled={saving} />
        </div>
      </div>
    </Modal>
  );
}

export default function DocumentsPage() {
  useDocumentTitle('Documents');
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => vendorService.listDocuments(), []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replacing, setReplacing] = useState<VendorDocument | null>(null);
  const [deleting, setDeleting] = useState<VendorDocument | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [preview, setPreview] = useState<VendorDocument | null>(null);
  // Files uploaded in this session, so they can be previewed / downloaded for real.
  const [localFiles, setLocalFiles] = useState<Record<string, UploadedFile>>({});

  const docs = data ?? [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs.filter((d) => (!term || d.name.toLowerCase().includes(term) || d.type.toLowerCase().includes(term)) && (!status || d.status === status));
  }, [docs, q, status]);

  const typeOf = (d: VendorDocument) => localFiles[d.id]?.type ?? (/\.(png|jpe?g)$/i.test(d.fileName) ? 'image/jpeg' : 'application/pdf');

  const download = (d: VendorDocument) => {
    const f = localFiles[d.id]?.file;
    if (f) downloadFile(d.fileName, f);
    else downloadFile(`${d.fileName}.txt`, `HumanCare Worldwide — sample document placeholder\n\n${d.name}\nType: ${d.type}\nStatus: ${d.status}\n\nIn production this downloads the stored file from the server.`);
    toast.success('Download started', d.fileName);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await vendorService.deleteDocument(deleting.id);
      setData((prev) => (prev ?? []).filter((d) => d.id !== deleting.id));
      toast.success('Document deleted', deleting.name);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns: Column<VendorDocument>[] = [
    {
      key: 'name',
      header: 'Document Name',
      sortable: true,
      primary: true,
      wrap: true,
      render: (d) => (
        <span className="flex items-center gap-3">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', /\.(png|jpe?g)$/i.test(d.fileName) ? 'bg-violet-50 text-violet-600' : 'bg-red-50 text-red-600')}>
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-slate-900">{d.name}</span>
            <span className="block text-xs text-slate-500">
              {d.fileName} · {formatBytes(d.size)}
            </span>
            {d.status === 'Rejected' && d.remarks && <span className="mt-0.5 block max-w-[300px] whitespace-normal text-xs text-red-600">{d.remarks}</span>}
          </span>
        </span>
      ),
    },
    { key: 'type', header: 'Document Type', sortable: true, hideOnMobile: true, wrap: true },
    { key: 'uploadedAt', header: 'Uploaded Date', sortable: true, render: (d) => formatDate(d.uploadedAt) },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      sortable: true,
      sortValue: (d) => d.expiryDate ?? '9999',
      render: (d) => {
        if (!d.expiryDate) return <span className="text-slate-400">No expiry</span>;
        const left = daysUntil(d.expiryDate);
        return (
          <span>
            {formatDate(d.expiryDate)}
            {left >= 0 && left <= 30 && <span className="block text-xs font-medium text-amber-600">Expires in {left} day{left === 1 ? '' : 's'}</span>}
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', sortable: true, render: (d) => <StatusBadge status={d.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Company, compliance and banking documents shared with HumanCare."
        actions={
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => {
              setReplacing(null);
              setUploadOpen(true);
            }}
          >
            Upload Document
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {SUMMARY.map((s) => (
          <button
            key={s.status}
            type="button"
            onClick={() => setStatus((cur) => (cur === s.status ? '' : s.status))}
            className={cn(
              'flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-card transition hover:border-brand-200',
              status === s.status ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200/80',
            )}
          >
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', s.tone)}>
              <s.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-semibold text-slate-900">{loading ? '–' : docs.filter((d) => d.status === s.status).length}</span>
              <span className="block text-xs font-medium text-slate-500">{s.status}</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <FilterBar search={q} onSearch={setQ} placeholder="Search documents…" showClear={!!(q || status)} onClear={() => { setQ(''); setStatus(''); }}>
          <Select aria-label="Status" className="col-span-2 sm:w-44" placeholder="All statuses" options={['Verified', 'Pending', 'Expired', 'Rejected']} value={status} onChange={(e) => setStatus(e.target.value)} />
        </FilterBar>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(d) => d.id}
            loading={loading}
            initialSort={{ key: 'uploadedAt', dir: 'desc' }}
            actions={(d) => (
              <>
                <RowAction label="Preview" onClick={() => setPreview(d)}>
                  <Eye className="h-4 w-4" />
                </RowAction>
                <RowAction label="Download" onClick={() => download(d)}>
                  <Download className="h-4 w-4" />
                </RowAction>
                {(d.status === 'Expired' || d.status === 'Rejected') && (
                  <RowAction
                    label="Replace"
                    onClick={() => {
                      setReplacing(d);
                      setUploadOpen(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </RowAction>
                )}
                <RowAction label="Delete" tone="danger" onClick={() => setDeleting(d)}>
                  <Trash2 className="h-4 w-4" />
                </RowAction>
              </>
            )}
            empty={<EmptyState icon={FileText} title="No documents found" description={q || status ? 'Try a different search or filter.' : 'Upload your first document to get started.'} />}
          />
        )}
      </Card>

      <UploadDocumentModal
        open={uploadOpen}
        replacing={replacing}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc, file) => {
          setLocalFiles((m) => ({ ...m, [doc.id]: file }));
          setData((prev) => [doc, ...(prev ?? []).filter((d) => d.id !== replacing?.id)]);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete document?"
        message={
          <>
            <span className="font-medium text-slate-800">{deleting?.name}</span> will be removed. Verified documents may need to be re-submitted for compliance.
          </>
        }
        confirmLabel="Delete"
      />
      {preview && <FilePreviewModal open onClose={() => setPreview(null)} name={preview.name} type={typeOf(preview)} url={localFiles[preview.id]?.previewUrl} />}
    </div>
  );
}
