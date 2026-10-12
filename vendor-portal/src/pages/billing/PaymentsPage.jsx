import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building, CheckCircle2, CreditCard, Download, Landmark, Smartphone, Wallet } from 'lucide-react';

import { INR_RATE } from '@/data/constants';
import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, RowAction } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { CardsSkeleton, Skeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Alert, PageHeader, SecureNote } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { downloadReceipt } from '@/utils/exports';
import { formatCompactINR, formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const METHODS = [
  { key: 'Bank Transfer', label: 'Bank Transfer', sub: 'NEFT / RTGS / SWIFT', icon: Landmark },
  { key: 'UPI', label: 'UPI', sub: 'INR invoices only', icon: Smartphone },
  { key: 'Card', label: 'Corporate Card', sub: 'Visa / Mastercard / Amex', icon: CreditCard },
];

function PayModal({ invoice, onClose, onPaid }) {
  const toast = useToast();
  const [method, setMethod] = useState('Bank Transfer');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (invoice) {
      setMethod('Bank Transfer');
      setDone(null);
    }
  }, [invoice]);

  const pay = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const p = await vendorService.payInvoice(invoice.id, method);
      setDone(p);
      onPaid(p);
      toast.success('Payment successful', `${formatCurrency(p.amount, p.currency)} paid for ${invoice.id}`);
    } catch (e) {
      toast.error('Payment failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const upiDisabled = invoice?.currency !== 'INR';

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      dismissible={!busy}
      title={done ? 'Payment complete' : `Pay ${invoice?.id ?? ''}`}
      description={done ? undefined : 'Demo checkout — no real money is moved.'}
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={pay} loading={busy}>
              {busy ? 'Processing…' : `Pay ${invoice ? formatCurrency(invoice.amount, invoice.currency) : ''}`}
            </Button>
          </>
        )
      }
    >
      {invoice &&
        (done ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </span>
            <p className="mt-4 text-lg font-semibold text-slate-900">{formatCurrency(done.amount, done.currency)} paid</p>
            <p className="mt-1 text-sm text-slate-500">
              Reference <span className="font-mono font-medium text-slate-700">{done.reference}</span>
            </p>
            <Button variant="outline" className="mt-5" leftIcon={<Download className="h-4 w-4" />} onClick={() => downloadReceipt(done)}>
              Download receipt
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">Amount due</p>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{formatCurrency(invoice.amount, invoice.currency)}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Case {invoice.caseId}</p>
                <p>Due {formatDate(invoice.dueDate)}</p>
              </div>
            </div>
            <p className="mb-2.5 mt-5 text-[13px] font-medium text-slate-700">Payment method</p>
            <div className="grid gap-2.5" role="radiogroup">
              {METHODS.map((m) => {
                const disabled = m.key === 'UPI' && upiDisabled;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="radio"
                    aria-checked={method === m.key}
                    disabled={disabled}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                      method === m.key ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        method === m.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      <m.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                      <span className="block text-xs text-slate-500">{disabled ? 'Not available for foreign-currency invoices' : m.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {method === 'Bank Transfer' && (
              <Alert tone="info" className="mt-4" title="Beneficiary: HumanCare Worldwide">
                Quote <span className="font-mono font-semibold">{invoice.id}</span> as the payment reference so the transfer is matched automatically.
              </Alert>
            )}
            <SecureNote className="mt-4">Payments are processed over an encrypted connection. Card numbers are never stored by HumanCare.</SecureNote>
          </div>
        ))}
    </Modal>
  );
}

export default function PaymentsPage() {
  useDocumentTitle('Payments');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload, setData } = useAsync(
    () => Promise.all([vendorService.listPayments(), vendorService.listInvoices(), vendorService.getProfile()]),
    [],
  );
  const [paying, setPaying] = useState(null);

  const payments = data?.[0] ?? [];
  const invoices = data?.[1] ?? [];
  const profile = data?.[2] ?? null;
  const unpaid = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== 'Paid')
        .sort((a, b) => (a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === 'Overdue' ? -1 : 1)),
    [invoices],
  );

  // Deep link from the Invoices page: /payments?pay=HCW-INV-…
  useEffect(() => {
    const id = params.get('pay');
    if (!id || !invoices.length) return;
    const inv = invoices.find((i) => i.id === id);
    if (inv && inv.status !== 'Paid') setPaying(inv);
    else if (inv) toast.info('Already paid', `${id} has been settled.`);
    setParams({}, { replace: true });
  }, [params, invoices, setParams, toast]);

  const sumINR = (list) => list.reduce((s, x) => s + x.amount * INR_RATE[x.currency], 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const lastPayment = payments.reduce((latest, p) => (!latest || p.date > latest.date ? p : latest), null);

  const columns = [
    {
      key: 'id',
      header: 'Payment ID',
      sortable: true,
      primary: true,
      render: (p) => <span className="font-mono text-[13px] font-semibold text-slate-900">{p.id}</span>,
    },
    {
      key: 'invoiceId',
      header: 'Invoice',
      className: 'hidden 2xl:table-cell',
      render: (p) => <span className="font-mono text-[13px] text-brand-700">{p.invoiceId}</span>,
    },
    { key: 'date', header: 'Date', sortable: true, render: (p) => formatDate(p.date) },
    { key: 'method', header: 'Method', sortable: true, wrap: true },
    {
      key: 'reference',
      header: 'Reference',
      hideOnMobile: true,
      className: 'hidden 2xl:table-cell',
      render: (p) => <span className="font-mono text-xs text-slate-500">{p.reference}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      sortValue: (p) => p.amount * INR_RATE[p.currency],
      render: (p) => <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(p.amount, p.currency)}</span>,
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Payments" description="Settle outstanding invoices and download receipts for completed payments." />

      {loading ? (
        <CardsSkeleton count={4} className="mb-6" />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total Paid" value={formatCompactINR(sumINR(payments))} icon={CheckCircle2} tone="green" hint={`${payments.length} payments`} />
          <StatCard
            label="Paid This Month"
            value={formatCompactINR(sumINR(payments.filter((p) => new Date(p.date).getTime() >= monthStart)))}
            icon={Wallet}
            tone="blue"
          />
          <StatCard
            label="Pending"
            value={formatCompactINR(sumINR(unpaid.filter((i) => i.status === 'Pending')))}
            icon={Building}
            tone="amber"
            hint={`${unpaid.filter((i) => i.status === 'Pending').length} invoices`}
          />
          <StatCard
            label="Overdue"
            value={formatCompactINR(sumINR(unpaid.filter((i) => i.status === 'Overdue')))}
            icon={CreditCard}
            tone="red"
            hint={lastPayment ? `Last payment ${formatDate(lastPayment.date)}` : undefined}
          />
        </div>
      )}

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader title="Outstanding Invoices" description="Overdue first" />
            {loading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : unpaid.length ? (
              <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                {unpaid.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] font-semibold text-slate-900">{i.id}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Due {formatDate(i.dueDate)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(i.amount, i.currency)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={i.status} />
                      <Button size="sm" onClick={() => setPaying(i)}>
                        Pay Now
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="All settled" description="You have no outstanding invoices." />
            )}
          </Card>

          <Card className="overflow-hidden xl:col-span-2">
            <CardHeader title="Payment History" description={lastPayment ? `Last payment ${formatDateTime(lastPayment.date)}` : undefined} />
            <DataTable
              data={payments}
              columns={columns}
              rowKey={(p) => p.id}
              loading={loading}
              pageSize={8}
              initialSort={{ key: 'date', dir: 'desc' }}
              actions={(p) => (
                <RowAction
                  label="Download receipt"
                  onClick={() => {
                    downloadReceipt(p, profile);
                    toast.success('Receipt downloaded', p.id);
                  }}
                >
                  <Download className="h-4 w-4" />
                </RowAction>
              )}
              empty={<EmptyState icon={Wallet} title="No payments yet" description="Payments you make will appear here." />}
            />
          </Card>
        </div>
      )}

      <PayModal
        invoice={paying}
        onClose={() => setPaying(null)}
        onPaid={(p) =>
          // The modal only opens once data has loaded, so prev is always set here.
          setData((prev) => {
            const [pays, invs, prof] = prev;
            return [[p, ...pays], invs.map((i) => (i.id === p.invoiceId ? { ...i, status: 'Paid' } : i)), prof];
          })
        }
      />
    </div>
  );
}
