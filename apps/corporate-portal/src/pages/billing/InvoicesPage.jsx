import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, Download, FileDown, Receipt, Wallet } from 'lucide-react';

import { CURRENCIES, INR_RATE } from '@/data/constants';
import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, RowAction } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { CardsSkeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/download';
import { downloadInvoice } from '@/utils/exports';
import { daysUntil, formatCompactINR, formatCurrency, formatDate } from '@/utils/format';

const inr = (i) => i.amount * INR_RATE[i.currency];

export default function InvoicesPage() {
  useDocumentTitle('Invoices');
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync(() => Promise.all([corporateService.listInvoices(), corporateService.getProfile()]), []);
  const invoices = data?.[0] ?? [];
  const profile = data?.[1] ?? null;

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const currency = params.get('currency') ?? '';
  const setParam = (k, v) =>
    setParams(
      (p) => {
        if (v) p.set(k, v);
        else p.delete(k);
        return p;
      },
      { replace: true },
    );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter(
      (i) =>
        (!term || i.id.toLowerCase().includes(term) || i.caseId.toLowerCase().includes(term) || i.service.toLowerCase().includes(term)) &&
        (!status || (status === 'unpaid' ? i.status !== 'Paid' : i.status === status)) &&
        (!currency || i.currency === currency),
    );
  }, [invoices, q, status, currency]);

  const totals = useMemo(() => {
    const sum = (list) => list.reduce((s, i) => s + inr(i), 0);
    return {
      invoiced: sum(invoices),
      paid: sum(invoices.filter((i) => i.status === 'Paid')),
      outstanding: sum(invoices.filter((i) => i.status !== 'Paid')),
      overdue: sum(invoices.filter((i) => i.status === 'Overdue')),
      overdueCount: invoices.filter((i) => i.status === 'Overdue').length,
    };
  }, [invoices]);

  const columns = [
    {
      key: 'id',
      header: 'Invoice Number',
      sortable: true,
      primary: true,
      render: (i) => <span className="font-mono text-[13px] font-semibold text-slate-900">{i.id}</span>,
    },
    { key: 'caseId', header: 'Case ID', render: (i) => <span className="font-mono text-[13px] text-brand-700">{i.caseId}</span> },
    { key: 'date', header: 'Invoice Date', sortable: true, render: (i) => formatDate(i.date) },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (i) => {
        const d = daysUntil(i.dueDate);
        return (
          <span>
            {formatDate(i.dueDate)}
            {i.status === 'Pending' && d <= 7 && (
              <span className="block text-xs font-medium text-amber-600">
                Due in {d} day{d === 1 ? '' : 's'}
              </span>
            )}
            {i.status === 'Overdue' && <span className="block text-xs font-medium text-red-600">{Math.abs(d)} days overdue</span>}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      sortValue: inr,
      render: (i) => <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(i.amount, i.currency)}</span>,
    },
    { key: 'currency', header: 'Currency', hideOnMobile: true },
    { key: 'status', header: 'Status', sortable: true, render: (i) => <StatusBadge status={i.status} /> },
  ];

  const exportCsv = () => {
    downloadCSV(
      `hcw-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Invoice Number', 'Case ID', 'Service', 'Invoice Date', 'Due Date', 'Amount', 'Currency', 'Status'],
      rows.map((i) => [i.id, i.caseId, i.service, formatDate(i.date), formatDate(i.dueDate), i.amount, i.currency, i.status]),
    );
    toast.success('Export ready', `${rows.length} invoices exported.`);
  };

  const filtered = !!(q || status || currency);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Invoices raised by HumanCare Worldwide for services delivered."
        actions={
          <Button variant="outline" leftIcon={<FileDown className="h-4 w-4" />} onClick={exportCsv} disabled={!rows.length}>
            Export
          </Button>
        }
      />

      {loading ? (
        <CardsSkeleton count={4} className="mb-6" />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total Invoiced" value={formatCompactINR(totals.invoiced)} icon={Receipt} tone="blue" hint={`${invoices.length} invoices`} />
          <StatCard label="Total Paid" value={formatCompactINR(totals.paid)} icon={CheckCircle2} tone="green" />
          <StatCard label="Outstanding" value={formatCompactINR(totals.outstanding)} icon={Wallet} tone="amber" hint="Pending + overdue" />
          <StatCard
            label="Overdue"
            value={formatCompactINR(totals.overdue)}
            icon={AlertTriangle}
            tone="red"
            hint={`${totals.overdueCount} invoice${totals.overdueCount === 1 ? '' : 's'}`}
          />
        </div>
      )}

      <Card className="overflow-hidden">
        <FilterBar
          search={q}
          onSearch={(v) => setParam('q', v)}
          placeholder="Search invoice, case or service…"
          showClear={filtered}
          onClear={() => setParams({}, { replace: true })}
        >
          <Select
            aria-label="Status"
            className="sm:w-44"
            placeholder="All statuses"
            options={[{ value: 'unpaid', label: 'Unpaid (all)' }, 'Paid', 'Pending', 'Overdue']}
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
          />
          <Select
            aria-label="Currency"
            className="sm:w-36"
            placeholder="All currencies"
            options={CURRENCIES.filter((c) => invoices.some((i) => i.currency === c))}
            value={currency}
            onChange={(e) => setParam('currency', e.target.value)}
          />
        </FilterBar>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(i) => i.id}
            loading={loading}
            initialSort={{ key: 'date', dir: 'desc' }}
            actions={(i) => (
              <>
                <RowAction
                  label="Download invoice"
                  onClick={() => {
                    downloadInvoice(i, profile);
                    toast.success('Download started', i.id);
                  }}
                >
                  <Download className="h-4 w-4" />
                </RowAction>
                {i.status !== 'Paid' && (
                  <RowAction label="Pay now" onClick={() => navigate(`/payments?pay=${encodeURIComponent(i.id)}`)}>
                    <CreditCard className="h-4 w-4" />
                  </RowAction>
                )}
              </>
            )}
            empty={
              <EmptyState
                icon={Receipt}
                title={filtered ? 'No invoices match your filters' : 'No invoices yet'}
                description={filtered ? 'Try a different search or filter.' : 'Invoices appear here once a case is under way.'}
              />
            }
          />
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-400">Summary totals convert foreign-currency invoices to INR at indicative rates.</p>
    </div>
  );
}
