import { useState } from 'react';
import { Info, Landmark, Pencil } from 'lucide-react';
import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader, InfoGrid } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/EmptyState';
import { PageHeader, SecureNote } from '@/components/ui/Misc';
import { UpdateBankModal, bankInfoItems } from '@/components/forms/BankInfo';
import { formatDateTime } from '@/utils/format';
import { maskAccount } from '@/utils/mask';

export default function BankDetailsPage() {
  useDocumentTitle('Bank Details');
  const { data: profile, loading, error, reload, setData } = useAsync(() => vendorService.getProfile(), []);
  const [editing, setEditing] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !profile)
    return (
      <Card>
        <ErrorState message={error} onRetry={reload} />
      </Card>
    );
  const b = profile.bank;

  return (
    <div>
      <PageHeader
        title="Bank Details"
        description="The account HumanCare uses for refunds and partner payouts."
        actions={
          <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
            Update Bank Details
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-brand-600" /> {b.bankName}
              </span>
            }
            description={`Last updated ${formatDateTime(b.updatedAt)}`}
            action={<StatusBadge status={b.verification} />}
          />
          <div className="p-5">
            <div className="mb-6 rounded-xl bg-gradient-to-br from-[#0B1F45] to-brand-800 p-5 text-white sm:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-brand-200">Bank account</p>
              <p className="mt-4 font-mono text-xl tracking-[0.18em] sm:text-2xl">{maskAccount(b.accountLast4)}</p>
              <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
                <span className="text-slate-200">{b.accountHolder}</span>
                <span className="font-mono text-slate-300">{b.bankType === 'Domestic' ? b.ifsc : b.swift}</span>
              </div>
            </div>
            <InfoGrid items={bankInfoItems(b)} />
            <SecureNote className="mt-6" />
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Why is my account masked?" />
          <div className="space-y-3 p-5 text-sm leading-relaxed text-slate-600">
            <p>For your security, the full account number is never shown after it is saved — only the last four digits.</p>
            <p>
              To change the payout account, use <span className="font-medium text-slate-800">Update Bank Details</span>. You will need to re-enter the full
              number, and the new account is verified before any payout.
            </p>
            {b.verification !== 'Verified' && (
              <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                Verification is in progress. Upload your bank proof under Documents if you haven’t already.
              </div>
            )}
          </div>
        </Card>
      </div>
      <UpdateBankModal
        country={profile.company.country}
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={(bank) => setData((p) => ({ ...p, bank }))}
      />
    </div>
  );
}
