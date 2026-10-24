import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';

import { CASE_DOCUMENT_TYPES } from '@/data/constants';
import { corporateService } from '@/services/corporateService';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { useToast } from '@/components/ui/Toast';

// Adds a document to a case that's already underway (passport, insurance, lab report,
// etc.) — separate from the single "Upload Medical Report" field on the request form,
// which only covers the one file attached at submission time. Shared by the Case
// Detail and Patient Profile pages, since both show the same case's document list.
export function AddCaseDocumentModal({ open, onClose, onAdded, caseId }) {
  const toast = useToast();
  const [type, setType] = useState('');
  const [file, setFile] = useState(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType('');
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
    if (!valid) return;
    setSaving(true);
    try {
      const doc = await corporateService.addCaseDocument(caseId, { type, file: file.file });
      onAdded(doc);
      toast.success('Document added');
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
      title="Add document"
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
      <div className="grid gap-4">
        <Field label="Document Type" required error={attempted ? errors.type : ''} htmlFor="case-doc-type">
          <Select
            id="case-doc-type"
            placeholder="Select type"
            options={CASE_DOCUMENT_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value)}
            invalid={attempted && !!errors.type}
          />
        </Field>
        <FileUpload label="File" required value={file} onChange={setFile} error={attempted ? errors.file : undefined} disabled={saving} />
      </div>
    </Modal>
  );
}
