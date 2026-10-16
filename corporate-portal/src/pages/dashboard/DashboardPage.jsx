import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2, ClipboardList, FileWarning, Hourglass, Plus, Users, Wallet } from 'lucide-react';

import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useUtils';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { CardsSkeleton, Skeleton } from '@/components/ui/Loading';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { PageHeader, Segmented } from '@/components/ui/Misc';
import { Select } from '@/components/ui/Select';
import { CompletedPendingChart, MonthlyCasesChart, ServiceWiseChart, StatusDonut } from '@/components/dashboard/Charts';
import { formatCompactINR, formatDate, greeting, relativeTime } from '@/utils/format';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'Last 3 Months' },
  { key: 'year', label: 'This Year' },
];

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items: notifications } = useNotifications();
  const [range, setRange] = useState('month');
  const { data, loading, error, reload } = useAsync(() => corporateService.getDashboard(range), [range]);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label.toLowerCase();

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.companyName || 'there'}`}
        description={`Here’s what’s happening with your account ${rangeLabel === 'today' ? 'today' : rangeLabel}.`}
        actions={
          <>
            <Segmented className="hidden xl:inline-flex" options={RANGES} value={range} onChange={setRange} />
            <Select
              className="w-44 xl:hidden"
              aria-label="Date range"
              options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
            <Link to="/services" className={buttonClasses({ className: 'hidden sm:inline-flex' })}>
              <Plus className="h-4 w-4" /> New Request
            </Link>
          </>
        }
      />

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <>
          {loading || !data ? (
            <CardsSkeleton count={8} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard label="Total Cases" value={data.stats.totalCases} icon={ClipboardList} tone="blue" to="/cases" hint={`Requested ${rangeLabel}`} />
              <StatCard
                label="Active Cases"
                value={data.stats.activeCases}
                icon={Activity}
                tone="violet"
                to="/cases?status=active"
                hint="Scheduled + in progress"
              />
              <StatCard label="Completed Cases" value={data.stats.completedCases} icon={CheckCircle2} tone="green" to="/cases?status=Completed" />
              <StatCard
                label="Pending Cases"
                value={data.stats.pendingCases}
                icon={Hourglass}
                tone="amber"
                to="/cases?status=Submitted"
                hint="Awaiting scheduling"
              />
              <StatCard label="Total Patients" value={data.stats.totalPatients} icon={Users} tone="teal" to="/patients" />
              <StatCard
                label="Pending Documents"
                value={data.stats.pendingDocuments}
                icon={FileWarning}
                tone="slate"
                to="/documents"
                hint="Under verification"
              />
              <StatCard
                label="Outstanding Payments"
                value={formatCompactINR(data.stats.outstandingAmount)}
                icon={Wallet}
                tone="red"
                to="/invoices?status=unpaid"
                hint="All currencies, in INR"
              />
              <Link
                to="/services"
                className="group flex flex-col justify-between rounded-xl border border-brand-600 bg-brand-600 p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                  <Plus className="h-5 w-5" />
                </span>
                <span>
                  <span className="mt-4 block text-[15px] font-semibold">Request a service</span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-brand-100">
                    Air, ground, rail &amp; escort <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            <Card className="xl:col-span-2">
              <CardHeader title="Case Status Overview" description={`Cases requested ${rangeLabel}`} />
              <div className="p-5">{loading || !data ? <Skeleton className="h-[200px]" /> : <StatusDonut data={data.statusBreakdown} />}</div>
            </Card>
            <Card className="xl:col-span-3">
              <CardHeader title="Monthly Cases" description="Requests over the last 12 months" />
              <div className="p-5 pt-4">{loading || !data ? <Skeleton className="h-[260px]" /> : <MonthlyCasesChart data={data.monthly} />}</div>
            </Card>
            <Card className="xl:col-span-3">
              <CardHeader title="Completed vs Pending Cases" description={`Breakdown for ${rangeLabel}`} />
              <div className="p-5 pt-4">{loading || !data ? <Skeleton className="h-[260px]" /> : <CompletedPendingChart data={data.completedVsPending} />}</div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Service-wise Cases" description={`Cases by service, ${rangeLabel}`} />
              <div className="p-5 pt-4">{loading || !data ? <Skeleton className="h-[260px]" /> : <ServiceWiseChart data={data.serviceWise} />}</div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader
                title="Recent Cases"
                description="Latest requests across all services"
                action={
                  <Link to="/cases" className="text-[13px] font-medium text-brand-600 hover:underline">
                    View all
                  </Link>
                }
              />
              {loading || !data ? (
                <div className="space-y-3 p-5">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : data.recentCases.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.recentCases.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/cases/${c.id}`)}
                        className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {c.patientName} <span className="font-normal text-slate-400">·</span>{' '}
                            <span className="font-normal text-slate-600">{c.service}</span>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            <span className="font-mono">{c.id}</span> · {formatDate(c.requestDate)}
                          </p>
                        </div>
                        <StatusBadge status={c.priority} className="hidden sm:inline-flex" />
                        <StatusBadge status={c.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No cases yet" description="Requests you raise will appear here." />
              )}
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader
                title="Latest Updates"
                action={
                  <Link to="/notifications" className="text-[13px] font-medium text-brand-600 hover:underline">
                    View all
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id} className="flex gap-3 px-5 py-3.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200' : 'bg-brand-600'}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{relativeTime(n.date)}</p>
                    </div>
                  </li>
                ))}
                {!notifications.length && <li className="px-5 py-8 text-center text-sm text-slate-500">No updates yet.</li>}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
