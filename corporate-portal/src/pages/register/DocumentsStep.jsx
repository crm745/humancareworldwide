import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, Landmark, Pencil } from 'lucide-react';
import { REGISTRATION_DOCUMENTS, countryName } from '@/data/constants';
import { registrationService } from '@/services/registrationService';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { FileUpload } from '@/components/ui/FileUpload';
import { Alert } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks/useUtils';
import { lastDigits, maskAccount } from '@/utils/mask';

import { StepFooter } from './StepFooter';
import { useRegistration } from './RegistrationContext';

export default function DocumentsStep() {
  useDocumentTitle('Documents');
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setDocument, saveDraft, requestCancel } = useRegistration();
  const [declared, setDeclared] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!state.company) return <Navigate to="/register/company" replace />;
  if (!state.bank) return <Navigate to="/register/bank" replace />;
  const { company, bank } = state;

  const documents = REGISTRATION_DOCUMENTS.filter((d) => !d.when || d.when(company));
  const missing = documents.filter((d) => d.required && !state.documents[d.key]);
  const uploadedCount = documents.filter((d) => state.documents[d.key]).length;

  const submit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    setError('');
    if (missing.length || !declared) return;
    setSubmitting(true);
    try {
      const docs = documents.flatMap((d) => {
        const f = state.documents[d.key];
        return f ? [{ key: d.key, label: d.label, fileName: f.name, size: f.size, status: 'Uploaded' }] : [];
      });
      const record = await registrationService.submit(company, bank, docs);
      registrationService.setCurrentId(record.id);
      registrationService.clearDraft();
      toast.success('Registration submitted', `Reference Corporate ID ${record.corporateId}`);
      navigate('/register/submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card className="p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Document Upload</h2>
            <p className="mt-1 text-sm text-slate-500">Upload clear scans. Accepted formats: PDF, JPG, PNG, WEBP, DOC, DOCX — maximum 10 MB each.</p>
          </div>
          <p className="text-sm font-medium text-slate-600">
            <span className="text-brand-600">{uploadedCount}</span> / {documents.length} uploaded
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {documents.map((d) => (
            <FileUpload
              key={d.key}
              label={d.label}
              description={d.description}
              required={d.required}
              value={state.documents[d.key] ?? null}
              onChange={(f) => setDocument(d.key, f)}
              error={attempted && d.required && !state.documents[d.key] ? `${d.label} is required` : undefined}
              disabled={submitting}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Review &amp; Submit</h2>
        <p className="mt-1 text-sm text-slate-500">Check your details before submitting. You can go back to edit them.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 className="h-4 w-4 text-brand-600" /> Company
              </p>
              <button
                type="button"
                onClick={() => navigate('/register/company')}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Name</dt>
                <dd className="text-right font-medium text-slate-800">{company.companyName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-slate-800">{company.companyType}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Location</dt>
                <dd className="text-right font-medium text-slate-800">
                  {company.city}, {countryName(company.country, company.countryOther)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Billing email</dt>
                <dd className="truncate font-medium text-slate-800">{company.officialEmail}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Landmark className="h-4 w-4 text-brand-600" /> Bank
              </p>
              <button
                type="button"
                onClick={() => navigate('/register/bank')}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Bank</dt>
                <dd className="font-medium text-slate-800">{bank.bankName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Account</dt>
                <dd className="font-mono font-medium text-slate-800">{maskAccount(lastDigits(bank.accountNumber))}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">{bank.bankType === 'Domestic' ? 'IFSC' : 'SWIFT'}</dt>
                <dd className="font-mono font-medium text-slate-800">{bank.bankType === 'Domestic' ? bank.ifsc : bank.swift}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Holder</dt>
                <dd className="truncate text-right font-medium text-slate-800">{bank.accountHolder}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-6">
          <Checkbox
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
            invalid={attempted && !declared}
            label="I confirm that the information and documents provided are accurate and that I am authorised to register this company with HumanCare Worldwide."
          />
          {attempted && !declared && <p className="mt-1.5 pl-6 text-xs font-medium text-red-600">Please confirm the declaration to continue.</p>}
        </div>

        {attempted && missing.length > 0 && (
          <Alert tone="warning" className="mt-5" title="Some required documents are missing">
            {missing.map((m) => m.label).join(', ')}
          </Alert>
        )}
        {error && (
          <Alert tone="error" className="mt-5">
            {error}
          </Alert>
        )}

        <StepFooter
          onBack={() => navigate('/register/bank')}
          onCancel={requestCancel}
          onSaveDraft={() => saveDraft('documents', {})}
          submitting={submitting}
          nextLabel={submitting ? 'Submitting…' : 'Submit Registration'}
        />
      </Card>
    </form>
  );
}
