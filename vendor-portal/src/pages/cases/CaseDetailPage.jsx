import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Download, LifeBuoy, MapPin, Navigation, Receipt, UserRound } from 'lucide-react';

import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader, InfoGrid } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { PageLoader } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Avatar, PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { downloadCaseSummary } from '@/utils/exports';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';

function caseTimeline(c) {
  const order = ['Submitted', 'Scheduled', 'In Progress', 'Completed'];
  const idx = order.indexOf(c.status);
  const at = (i) => (i === 0 ? c.requestDate : i === 1 ? (c.scheduledDate ?? undefined) : undefined);
  if (c.status === 'Cancelled') {
    return [
      { title: 'Request Submitted', status: 'complete', date: c.requestDate },
      { title: 'Case Cancelled', description: 'This request was cancelled. Contact support if this is unexpected.', status: 'failed' },
    ];
  }
  const steps = [
    { title: 'Request Submitted', description: 'Received by HumanCare operations desk.' },
    { title: 'Scheduled', description: 'Team, vehicle / aircraft and timing confirmed.' },
    { title: 'In Progress', description: 'Patient transfer under way.' },
    { title: 'Completed', description: 'Patient handed over at destination.' },
  ];
  return steps.map((s, i) => ({ ...s, status: i < idx || c.status === 'Completed' ? 'complete' : i === idx ? 'current' : 'pending', date: at(i) }));
}

export default function CaseDetailPage() {
  const { caseId = '' } = useParams();
  useDocumentTitle(caseId);
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => vendorService.getCase(caseId), [caseId]);

  if (loading) return <PageLoader label="Loading case…" />;
  if (error || !data) {
    return (
      <Card>
        {error?.includes('not found') ? (
          <EmptyState
            title="Case not found"
            description={`We couldn’t find ${caseId}. It may have been removed or the link is incorrect.`}
            action={
              <Link to="/cases" className={buttonClasses()}>
                Back to cases
              </Link>
            }
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </Card>
    );
  }

  const { case: c, invoice, patient } = data;
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Cases / Requests', to: '/cases' }, { label: c.id }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{c.id}</span>
            <StatusBadge status={c.status} />
            <StatusBadge status={c.priority} />
          </span>
        }
        description={`${c.service} · requested ${formatDateTime(c.requestDate)}`}
        actions={
          <>
            <Link to={`/support?subject=${encodeURIComponent(`Query on ${c.id}`)}`} className={buttonClasses({ variant: 'outline' })}>
              <LifeBuoy className="h-4 w-4" /> Contact Support
            </Link>
            <Button
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => {
                downloadCaseSummary(c);
                toast.success('Download started', `${c.id} summary`);
              }}
            >
              Download Summary
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Case Overview" />
            <div className="p-5">
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl border border-slate-200 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pickup</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{c.pickup}</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-slate-200 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Navigation className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Destination</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{c.destination}</p>
                  </div>
                </div>
              </div>
              <InfoGrid
                cols={3}
                items={[
                  { label: 'Service', value: c.service },
                  { label: 'Request Date', value: formatDateTime(c.requestDate) },
                  { label: 'Scheduled', value: formatDateTime(c.scheduledDate) },
                  { label: 'Assigned Team', value: c.assignedTeam },
                  { label: 'Priority', value: <StatusBadge status={c.priority} /> },
                  { label: 'Status', value: <StatusBadge status={c.status} /> },
                ]}
              />
              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
                <p className="mt-1 text-sm text-slate-700">{c.notes || '—'}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Billing" />
            <div className="p-5">
              {invoice ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-slate-900">{invoice.id}</p>
                    <p className="text-xs text-slate-500">Due {formatDate(invoice.dueDate)}</p>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(invoice.amount, invoice.currency)}</p>
                  <StatusBadge status={invoice.status} />
                  <Link to={`/invoices?q=${invoice.id}`} className="text-[13px] font-medium text-brand-600 hover:underline">
                    View invoice
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No invoice has been raised for this case yet. Invoices are issued once the transfer is under way.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Patient" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={c.patientName} size="lg" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{c.patientName}</p>
                  <p className="font-mono text-xs text-slate-500">{c.patientId}</p>
                </div>
              </div>
              {patient && (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">Age / Gender</dt>
                    <dd className="font-medium text-slate-800">
                      {patient.age} · {patient.gender}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Country</dt>
                    <dd className="font-medium text-slate-800">{patient.country}</dd>
                  </div>
                </dl>
              )}
              <Link to={`/patients/${c.patientId}`} className={buttonClasses({ variant: 'secondary', fullWidth: true, className: 'mt-5' })}>
                <UserRound className="h-4 w-4" /> View patient profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
          <Card>
            <CardHeader title="Case Timeline" />
            <div className="p-5">
              <StatusTimeline items={caseTimeline(c)} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
