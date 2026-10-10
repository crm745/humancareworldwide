import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Eye, FileImage, FileText, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { ACCEPTED_EXTENSIONS, ACCEPTED_FILE_TYPES, MAX_UPLOAD_MB } from '@/data/constants';
import { formatBytes } from '@/utils/format';
import { randomId } from '@/utils/crypto';
import { cn } from '@/utils/cn';
import { StatusBadge } from './Badge';
import { Modal } from './Modal';

export type UploadStatus = 'Uploaded' | 'Pending Verification' | 'Verified' | 'Rejected';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  /** Object URL for in-browser preview; only exists for files picked in this session. */
  previewUrl?: string;
  file?: File;
}

interface FileUploadProps {
  label?: string;
  description?: string;
  required?: boolean;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  maxSizeMB?: number;
  error?: string;
  disabled?: boolean;
}

const isImage = (type: string) => type.startsWith('image/');

/**
 * Drag-and-drop / browse uploader for one document. Validates type and size, shows a
 * simulated upload progress (the real API would report XHR progress), then preview / delete.
 */
export function FileUpload({ label, description, required, value, onChange, maxSizeMB = MAX_UPLOAD_MB, error, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ name: string; size: number; pct: number } | null>(null);
  const [localError, setLocalError] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const accept = (file: File) => {
    setLocalError('');
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setLocalError('Unsupported file type. Upload a PDF, JPG or PNG file.');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File is too large (${formatBytes(file.size)}). Maximum size is ${maxSizeMB} MB.`);
      return;
    }
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    setProgress({ name: file.name, size: file.size, pct: 0 });
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setProgress((p) => {
        if (!p) return p;
        const pct = Math.min(100, p.pct + 12 + Math.random() * 18);
        if (pct >= 100) {
          window.clearInterval(timer.current);
          setTimeout(() => {
            setProgress(null);
            onChange({ id: randomId('f_'), name: file.name, size: file.size, type: file.type, status: 'Uploaded', previewUrl: URL.createObjectURL(file), file });
          }, 180);
        }
        return { ...p, pct };
      });
    }, 140);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) accept(f);
  };

  const remove = () => {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
  };

  const shownError = localError || error;
  const Icon = value && isImage(value.type) ? FileImage : FileText;

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-medium text-slate-800">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </p>
          {description && <p className="hidden text-xs text-slate-500 sm:block">{description}</p>}
        </div>
      )}

      {progress ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 shrink-0 text-brand-500" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="truncate font-medium text-slate-800">{progress.name}</span>
                <span className="shrink-0 text-slate-500">{Math.round(progress.pct)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-150" style={{ width: `${progress.pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Uploading · {formatBytes(progress.size)}</p>
            </div>
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', isImage(value.type) ? 'bg-violet-50 text-violet-600' : 'bg-red-50 text-red-600')}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-800">{value.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">{formatBytes(value.size)}</span>
              <StatusBadge status={value.status} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => setPreview(true)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label={`Preview ${value.name}`} title="Preview">
              <Eye className="h-4 w-4" />
            </button>
            {!disabled && (
              <>
                <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Replace file" title="Replace">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button type="button" onClick={remove} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${value.name}`} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
            dragging ? 'border-brand-500 bg-brand-50' : shownError ? 'border-red-300 bg-red-50/30' : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/40',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-semibold text-brand-600">Browse files</span> or drag and drop
          </p>
          <p className="mt-1 text-xs text-slate-500">PDF, JPG or PNG · up to {maxSizeMB} MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) accept(f);
          e.target.value = '';
        }}
      />
      {shownError && (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {shownError}
        </p>
      )}

      {value && <FilePreviewModal open={preview} onClose={() => setPreview(false)} name={value.name} type={value.type} url={value.previewUrl} />}
    </div>
  );
}

export function FilePreviewModal({ open, onClose, name, type, url }: { open: boolean; onClose: () => void; name: string; type: string; url?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={name} description="Document preview" size="xl">
      {!url ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Preview not available</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">This file is stored on the HumanCare server. Use Download to open it.</p>
        </div>
      ) : isImage(type) ? (
        <img src={url} alt={name} className="mx-auto max-h-[70vh] rounded-lg object-contain" />
      ) : type === 'application/pdf' ? (
        <iframe src={url} title={name} className="h-[70vh] w-full rounded-lg border border-slate-200" />
      ) : (
        <p className="text-sm text-slate-600">Preview is not supported for this file type.</p>
      )}
    </Modal>
  );
}
