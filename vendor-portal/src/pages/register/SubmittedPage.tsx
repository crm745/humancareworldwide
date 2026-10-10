import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Copy, Download, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { PageLoader } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks/useUtils';
import { countryName } from '@/data/constants';
import { buildDocumentHtml, downloadFile } from '@/utils/download';
import { formatDateTime } from '@/utils/format';
import { maskAccount } from '@/utils/mask';
import { registrationTimeline, useCurrentRegistration } from './useCurrentRegistration';

export default function SubmittedPage() {
  useDocumentTitle('Registration Submitted');
  const navigate = useNavigate();
  const toast = useToast();
  const { data: reg, loading } = useCurrentRegistration();
  const [copied, setCopied] = useState(false);

  if (loading || !reg) return <PageLoader label="Loading your registration…" />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reg.vendorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy', 'Select the ID and copy it manually.');
    }
  };

  const downloadAck = () => {
    const html = buildDocumentHtml('Vendor Registration Acknowledgement', `Reference Vendor ID ${reg.vendorId}`, [
      {
        heading: 'Registration',
        rows: [
          ['Vendor ID (reference)', reg.vendorId],
          ['Status', reg.status],
          ['Submitted on', formatDateTime(reg.submittedAt)],
          ['Verification method', 'Email Verification'],
          ['Expected verification', 'Within 48 hours'],
        ],
      },
      {
        heading: 'Company',
        rows: [
          ['Company name', reg.company.companyName],
          ['Company type', reg.company.companyType],
          ['Location', `${reg.company.city}, ${countryName(reg.company.country, reg.company.countryOther)}`],
          ['Official email', reg.company.officialEmail],
        ],
      },
      { heading: 'Bank', rows: [['Bank', reg.bank.bankName], ['Account', maskAccount(reg.bank.accountLast4)]] },
      { heading: 'Documents', rows: reg.documents.map((d) => [d.label, `${d.fileName} — ${d.status}`] as [string, string]) },
    ]);
    downloadFile(`${reg.vendorId}-acknowledgement.html`, html, 'text/html;charset=utf-8');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 sm:p-8 lg:col-span-3">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Your vendor registration has been submitted.</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Thank you, {reg.company.contactName}. Keep your reference Vendor ID for any communication with HumanCare.
          </p>
        </div>

        <div className="mt-7 rounded-xl border border-brand-100 bg-brand-50/50 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Vendor ID</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <p className="font-mono text-2xl font-semibold tracking-wide text-slate-900 sm:text-[26px]">{reg.vendorId}</p>
            <button type="button" onClick={copy} className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-brand-600" aria-label="Copy Vendor ID">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Temporary reference — confirmed once verification is complete</p>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Registration Status
            </dt>
            <dd className="mt-2">
              <StatusBadge status={reg.status} />
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Mail className="h-3.5 w-3.5" /> Verification Method
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">Email Verification</dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Expected Verification
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-900">Within 48 Hours</dd>
          </div>
        </dl>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={downloadAck}>
            Download Acknowledgement
          </Button>
          <Button rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/register/verify-email')}>
            Continue to Email Verification
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Verification Status" description={`Submitted ${formatDateTime(reg.submittedAt)}`} />
        <div className="p-5">
          <StatusTimeline items={registrationTimeline(reg)} />
        </div>
      </Card>
    </div>
  );
}
