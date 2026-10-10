import { useEffect, useState, type ClipboardEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, Globe2, Landmark } from 'lucide-react';
import type { BankDetailsInput, BankType } from '@/types';
import { CURRENCIES } from '@/data/constants';
import { bankSchema, type BankFormValues } from '@/utils/schemas';
import { IFSC_RE } from '@/utils/validators';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SecureNote } from '@/components/ui/Misc';
import type { FormFooterApi } from './CompanyDetailsForm';

export const EMPTY_BANK: BankDetailsInput = {
  bankType: 'Domestic', bankName: '', accountHolder: '', accountNumber: '', confirmAccountNumber: '', ifsc: '', branchName: '', branchAddress: '',
  swift: '', iban: '', bankCountry: '', bankAddress: '', currency: '',
};

// Offline IFSC prefix lookup (mock). The real app would call an IFSC directory API.
const IFSC_BANKS: Record<string, string> = {
  HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', SBIN: 'State Bank of India', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank', YESB: 'Yes Bank',
  PUNB: 'Punjab National Bank', BARB: 'Bank of Baroda', CNRB: 'Canara Bank', IDIB: 'Indian Bank', INDB: 'IndusInd Bank', FDRL: 'Federal Bank',
};

interface Props {
  /** Indian (IFSC) or overseas (SWIFT) fields — decided by the company's country, not chosen by the user. */
  bankType: BankType;
  defaultValues?: Partial<BankDetailsInput>;
  onSubmit: (values: BankDetailsInput) => void | Promise<void>;
  footer: (api: FormFooterApi<BankFormValues>) => ReactNode;
}

export function BankDetailsForm({ bankType, defaultValues, onSubmit, footer }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: { ...EMPTY_BANK, ...defaultValues, bankType } as BankFormValues,
    mode: 'onTouched',
  });
  const [bankHint, setBankHint] = useState('');

  const ifsc = watch('ifsc');

  useEffect(() => {
    const code = (ifsc ?? '').toUpperCase();
    if (!IFSC_RE.test(code)) {
      setBankHint('');
      return;
    }
    const name = IFSC_BANKS[code.slice(0, 4)];
    setBankHint(name ? `Bank identified: ${name}` : '');
    if (name && !getValues('bankName')) setValue('bankName', name, { shouldValidate: true });
  }, [ifsc, getValues, setValue]);

  // Account numbers are never pasted into the confirm field — a common banking safeguard.
  const noPaste = { onPaste: (e: ClipboardEvent) => e.preventDefault(), autoComplete: 'off' };

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v as BankDetailsInput))} noValidate>
      <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-600">
        {bankType === 'Domestic' ? <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> : <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />}
        {bankType === 'Domestic'
          ? 'Indian bank account — payouts by NEFT / RTGS using the IFSC code.'
          : 'Overseas bank account — payouts by SWIFT wire transfer, as your company is registered outside India.'}
      </p>

      <div className="mt-6 grid gap-x-5 gap-y-4 md:grid-cols-2">
        <Field label="Bank Name" required error={errors.bankName?.message} hint={bankHint ? <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />{bankHint}</span> : undefined} htmlFor="bankName">
          <Input id="bankName" placeholder={bankType === 'Domestic' ? 'e.g. HDFC Bank' : 'e.g. First Abu Dhabi Bank'} invalid={!!errors.bankName} {...register('bankName')} />
        </Field>
        <Field label="Account Holder Name" required error={errors.accountHolder?.message} hint="Must match your registered company name" htmlFor="accountHolder">
          <Input id="accountHolder" placeholder="Name as per bank records" invalid={!!errors.accountHolder} {...register('accountHolder')} />
        </Field>

        <Field label="Account Number" required error={errors.accountNumber?.message} htmlFor="accountNumber">
          <PasswordInput
            id="accountNumber"
            placeholder={bankType === 'Domestic' ? '9–18 digit account number' : 'Account number'}
            inputMode={bankType === 'Domestic' ? 'numeric' : 'text'}
            autoComplete="off"
            invalid={!!errors.accountNumber}
            {...register('accountNumber')}
          />
        </Field>

        {bankType === 'Domestic' ? (
          <>
            <Field label="Confirm Account Number" required error={errors.confirmAccountNumber?.message} htmlFor="confirmAccountNumber">
              <Input id="confirmAccountNumber" placeholder="Re-enter account number" inputMode="numeric" invalid={!!errors.confirmAccountNumber} {...noPaste} {...register('confirmAccountNumber')} />
            </Field>
            <Field label="IFSC Code" required error={errors.ifsc?.message} hint="11 characters, e.g. HDFC0001234" htmlFor="ifsc">
              <Input id="ifsc" placeholder="HDFC0001234" maxLength={11} className="uppercase placeholder:normal-case" invalid={!!errors.ifsc} {...register('ifsc')} />
            </Field>
            <Field label="Branch Name" required error={errors.branchName?.message} htmlFor="branchName">
              <Input id="branchName" placeholder="e.g. Powai, Mumbai" invalid={!!errors.branchName} {...register('branchName')} />
            </Field>
            <Field label="Branch Address" required error={errors.branchAddress?.message} htmlFor="branchAddress" className="md:col-span-2">
              <Input id="branchAddress" placeholder="Branch street address" invalid={!!errors.branchAddress} {...register('branchAddress')} />
            </Field>
          </>
        ) : (
          <>
            <Field label="SWIFT / BIC Code" required error={errors.swift?.message} hint="8 or 11 characters" htmlFor="swift">
              <Input id="swift" placeholder="NBADAEAAXXX" maxLength={11} className="uppercase placeholder:normal-case" invalid={!!errors.swift} {...register('swift')} />
            </Field>
            <Field label="IBAN" error={errors.iban?.message} hint="Required for UAE, UK, EU and GCC accounts" htmlFor="iban">
              <PasswordInput id="iban" placeholder="AE07 0331 2345 6789 0123 456" autoComplete="off" className="uppercase placeholder:normal-case" invalid={!!errors.iban} {...register('iban')} />
            </Field>
            <Field label="Bank Country" required error={errors.bankCountry?.message} htmlFor="bankCountry">
              <Input id="bankCountry" placeholder="e.g. United Arab Emirates" invalid={!!errors.bankCountry} {...register('bankCountry')} />
            </Field>
            <Field label="Currency" required error={errors.currency?.message} htmlFor="currency">
              <Select id="currency" placeholder="Select currency" options={CURRENCIES} invalid={!!errors.currency} {...register('currency')} />
            </Field>
            <Field label="Bank Address" required error={errors.bankAddress?.message} htmlFor="bankAddress" className="md:col-span-2">
              <Input id="bankAddress" placeholder="Bank / branch address" invalid={!!errors.bankAddress} {...register('bankAddress')} />
            </Field>
          </>
        )}
      </div>

      <SecureNote className="mt-6" />
      {footer({ submitting: isSubmitting, getValues })}
    </form>
  );
}
