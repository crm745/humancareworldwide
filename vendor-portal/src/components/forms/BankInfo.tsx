import type { BankDetailsMasked } from '@/types';
import { vendorService } from '@/services/vendorService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { maskAccount } from '@/utils/mask';
import { BankDetailsForm } from './BankDetailsForm';

/** Label/value rows for a masked bank account (Bank Details + Company Profile). */
export function bankInfoItems(b: BankDetailsMasked) {
  const common = [
    { label: 'Bank Name', value: b.bankName },
    { label: 'Account Holder', value: b.accountHolder },
    { label: 'Account Number', value: <span className="font-mono tracking-wide">{maskAccount(b.accountLast4)}</span> },
  ];
  return b.bankType === 'Domestic'
    ? [...common, { label: 'IFSC Code', value: <span className="font-mono">{b.ifsc}</span> }, { label: 'Branch', value: b.branchName }, { label: 'Branch Address', value: b.branchAddress }]
    : [
        ...common,
        { label: 'SWIFT / BIC', value: <span className="font-mono">{b.swift}</span> },
        { label: 'IBAN', value: b.ibanLast4 ? <span className="font-mono">XXXX XXXX XXXX {b.ibanLast4}</span> : '—' },
        { label: 'Bank Country', value: b.bankCountry },
        { label: 'Currency', value: b.currency },
        { label: 'Bank Address', value: b.bankAddress },
      ];
}

/** Modal used here and on the Company Profile page. */
export function UpdateBankModal({ open, onClose, onSaved, country }: { open: boolean; onClose: () => void; onSaved: (bank: BankDetailsMasked) => void; country: string }) {
  const toast = useToast();
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Update bank details" description="Changes are re-verified by HumanCare finance before the next payout.">
      <BankDetailsForm
        bankType={country === 'IN' ? 'Domestic' : 'International'}
        onSubmit={async (values) => {
          try {
            const profile = await vendorService.updateBank(values);
            onSaved(profile.bank);
            toast.success('Bank details submitted', 'Your new account is pending verification.');
            onClose();
          } catch (e) {
            toast.error('Could not update bank details', e instanceof Error ? e.message : undefined);
          }
        }}
        footer={({ submitting }) => (
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit for Verification
            </Button>
          </div>
        )}
      />
    </Modal>
  );
}
