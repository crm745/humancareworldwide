import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Trash2, Upload } from 'lucide-react';

import { DOCUMENT_TYPES } from '@/data/constants';
import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, RowAction } from '@/components/ui/Table';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FilePreviewModal, FileUpload } from '@/components/ui/FileUpload';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

function UploadDocumentModal({ open, onClose, onUploaded }) {
  const toast = useToast();
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType('');
    setName('');
    setFile(null);
    setAttempted(false);
  }, [open]);

  const errors = {
    type: !type ? 'Select a document type' : '',
    file: !file ? 'Upload the document file' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = async () => {
    setAttempted(true);
    if (!valid || !file) return;
    setSaving(true);
    try {
      // `file` here is FileUpload's own wrapper object ({ id, name, size, status, file, ... })
      // used to drive its preview UI — the real File/Blob to send is nested at `file.file`.
      const doc = await corporateService.uploadDocument({ type, name: name.trim() || undefined, file: file.file });
      onUploaded(doc);
      toast.success('Document uploaded');
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
      title="Upload document"
      description="Accepted formats: PDF, JPG, PNG, WEBP, DOC, DOCX — maximum 10 MB."
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
          <Select
            id="doc-type"
            placeholder="Select type"
            options={DOCUMENT_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value)}
            invalid={attempted && !!errors.type}
          />
        </Field>
        <Field label="Document Name" hint="Optional — defaults to the file name" htmlFor="doc-name">
          <Input id="doc-name" placeholder="e.g. Trade Licence 2026" value={name} onChange={(e) => setName(e.target.value)} />
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
  const { data, loading, error, reload, setData } = useAsync(() => corporateService.listDocuments(), []);
  const [q, setQ] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState({ url: null, type: '', loading: false });

  const docs = data ?? [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs.filter((d) => !term || d.name.toLowerCase().includes(term) || d.type.toLowerCase().includes(term));
  }, [docs, q]);

  // Fetches the actual file (as a blob, since the download route needs auth headers a
  // plain <img>/<iframe> src can't send) whenever a document is opened for preview.
  useEffect(() => {
    if (!preview) return;
    let cancelled = false;
    let objectUrl = null;
    setFile({ url: null, type: '', loading: true });
    corporateService
      .getCorporateDocumentFile(preview.id)
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

  // The file route needs a Bearer token a plain <a href> can't send, so this fetches
  // it as a blob first (same as preview), then clicks a throwaway link to save it.
  const download = async (d) => {
    try {
      const res = await corporateService.getCorporateDocumentFile(d.id);
      if (!res) return;
      const a = document.createElement('a');
      a.href = res.url;
      a.download = d.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(res.url), 1000);
    } catch (e) {
      toast.error('Download failed', e instanceof Error ? e.message : undefined);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await corporateService.deleteDocument(deleting.id);
      setData((prev) => (prev ?? []).filter((d) => d.id !== deleting.id));
      toast.success('Document deleted', deleting.name);
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Document Name',
      sortable: true,
      primary: true,
      wrap: true,
      render: (d) => (
        <span className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              /\.(png|jpe?g)$/i.test(d.fileName) ? 'bg-violet-50 text-violet-600' : 'bg-red-50 text-red-600',
            )}
          >
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-slate-900">{d.name}</span>
            <span className="block text-xs text-slate-500">
              {d.fileName} · {formatBytes(d.size)}
            </span>
          </span>
        </span>
      ),
    },
    { key: 'type', header: 'Document Type', sortable: true, hideOnMobile: true, wrap: true },
    { key: 'uploadedAt', header: 'Uploaded Date', sortable: true, render: (d) => formatDate(d.uploadedAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Company and compliance documents shared with HumanCare."
        actions={
          <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
            Upload Document
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <FilterBar search={q} onSearch={setQ} placeholder="Search documents…" showClear={!!q} onClear={() => setQ('')} />
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
                <RowAction label="Delete" tone="danger" onClick={() => setDeleting(d)}>
                  <Trash2 className="h-4 w-4" />
                </RowAction>
              </>
            )}
            empty={
              <EmptyState icon={FileText} title="No documents found" description={q ? 'Try a different search.' : 'Upload your first document to get started.'} />
            }
          />
        )}
      </Card>

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => setData((prev) => [doc, ...(prev ?? [])])}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete document?"
        message={<><span className="font-medium text-slate-800">{deleting?.name}</span> will be removed.</>}
        confirmLabel="Delete"
      />
      <FilePreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        name={preview?.name ?? ''}
        type={file.type}
        url={file.url}
        loading={file.loading}
      />
    </div>
  );
}
