import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Contact, MapPin, Phone } from 'lucide-react';
import type { CompanyDetails, CountryCode } from '@/types';
import { COMPANY_TYPES, COUNTRIES, STATES } from '@/data/constants';
import { companySchema, type CompanyFormValues } from '@/utils/schemas';
import { pincodeRule, registrationRule } from '@/utils/validators';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export const EMPTY_COMPANY: CompanyDetails = {
  companyName: '', registrationNumber: '', companyType: '', country: '', countryOther: '', state: '', city: '', address: '', pincode: '',
  officialEmail: '', officialPhone: '', website: '', contactName: '', contactDesignation: '', contactEmail: '', contactPhone: '',
};

export interface FormFooterApi<T> {
  submitting: boolean;
  getValues: () => T;
}

interface Props {
  defaultValues?: Partial<CompanyDetails>;
  onSubmit: (values: CompanyDetails) => void | Promise<void>;
  footer: (api: FormFooterApi<CompanyFormValues>) => ReactNode;
  /** Report unsaved edits (e.g. to warn before leaving). */
  onDirtyChange?: (dirty: boolean) => void;
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Building2; title: string; description: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-100 pb-7 last:border-0 last:pb-0">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          <p className="text-[13px] text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function CompanyDetailsForm({ defaultValues, onSubmit, footer, onDirtyChange }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { ...EMPTY_COMPANY, ...defaultValues } as CompanyFormValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const country = watch('country') as CountryCode | '';
  const states = country ? STATES[country] : undefined;
  const dial = COUNTRIES.find((c) => c.code === country)?.dial || undefined;
  const pin = pincodeRule(country);
  const companyType = watch('companyType');
  const reg = registrationRule(companyType, country);

  // Changing the country invalidates the state picked from the previous country's list.
  const countryField = register('country', { onChange: () => setValue('state', '') });

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v as CompanyDetails))} noValidate>
      <div className="space-y-7">
        <Section icon={Building2} title="Authorized Company Information" description="Legal details exactly as they appear on your registration certificate.">
          <Field label="Company Name" required error={errors.companyName?.message} htmlFor="companyName">
            <Input id="companyName" placeholder="e.g. MediCorp Global Assistance Pvt. Ltd." autoComplete="organization" invalid={!!errors.companyName} {...register('companyName')} />
          </Field>
          <Field label="Website (Optional)" error={errors.website?.message} htmlFor="website">
            <Input id="website" placeholder="www.yourcompany.com" inputMode="url" invalid={!!errors.website} {...register('website')} />
          </Field>
          <Field label="Company Type" required error={errors.companyType?.message} htmlFor="companyType">
            <Select id="companyType" placeholder="Select company type" options={COMPANY_TYPES} invalid={!!errors.companyType} {...register('companyType')} />
          </Field>
          {reg ? (
            <Field label={reg.label} required={reg.required} error={errors.registrationNumber?.message} hint={reg.hint} htmlFor="registrationNumber">
              <Input id="registrationNumber" placeholder={reg.placeholder} maxLength={30} className="uppercase placeholder:normal-case" invalid={!!errors.registrationNumber} {...register('registrationNumber')} />
            </Field>
          ) : (
            <Field label="Registration Number" hint={companyType === 'Hindu Undivided Family (HUF)' ? 'Not applicable for an HUF' : 'Select the company type first'} htmlFor="registrationNumber">
              <Input id="registrationNumber" placeholder="Not applicable" disabled />
            </Field>
          )}
        </Section>

        <Section icon={Contact} title="Authorized Contact Person" description="The person HumanCare will contact about this registration.">
          <Field label="Contact Person Name" required error={errors.contactName?.message} htmlFor="contactName">
            <Input id="contactName" placeholder="Full name as per government ID" autoComplete="name" invalid={!!errors.contactName} {...register('contactName')} />
          </Field>
          <Field label="Designation" required error={errors.contactDesignation?.message} htmlFor="contactDesignation">
            <Input id="contactDesignation" placeholder="e.g. Director, Operations Head" autoComplete="organization-title" invalid={!!errors.contactDesignation} {...register('contactDesignation')} />
          </Field>
          <Field label="Contact Person Email" required error={errors.contactEmail?.message} htmlFor="contactEmail">
            <Input id="contactEmail" type="email" placeholder="name@yourcompany.com" invalid={!!errors.contactEmail} {...register('contactEmail')} />
          </Field>
          <Field label="Contact Person Mobile" required error={errors.contactPhone?.message} hint={dial ? undefined : 'Select the country below for the dialing code'} htmlFor="contactPhone">
            <Input id="contactPhone" type="tel" prefix={dial} placeholder={country === 'IN' ? '10-digit mobile, e.g. 98765 43210' : 'Mobile number'} invalid={!!errors.contactPhone} {...register('contactPhone')} />
          </Field>
        </Section>

        <Section icon={MapPin} title="Registered Address" description="Head-office address used for contracts and invoices.">
          <Field label="Country" required error={errors.country?.message} htmlFor="country">
            <Select id="country" placeholder="Select country" options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} invalid={!!errors.country} {...countryField} />
          </Field>
          {country === 'OTHER' && (
            <Field label="Country Name" required error={errors.countryOther?.message} htmlFor="countryOther">
              <Input id="countryOther" placeholder="Enter the country name" invalid={!!errors.countryOther} {...register('countryOther')} />
            </Field>
          )}
          <Field label="State / Province" required error={errors.state?.message} htmlFor="state">
            {states ? (
              <Select id="state" placeholder="Select state" options={states} invalid={!!errors.state} {...register('state')} />
            ) : (
              <Input id="state" placeholder={country ? 'Enter state / province' : 'Select a country first'} disabled={!country} invalid={!!errors.state} {...register('state')} />
            )}
          </Field>
          <Field label="City" required error={errors.city?.message} htmlFor="city">
            <Input id="city" placeholder="e.g. Mumbai" autoComplete="address-level2" invalid={!!errors.city} {...register('city')} />
          </Field>
          <Field label="Postal Code / ZIP Code" required={pin.required} error={errors.pincode?.message} hint={pin.hint} htmlFor="pincode">
            <Input id="pincode" placeholder={pin.placeholder} inputMode={country === 'IN' || country === 'US' ? 'numeric' : 'text'} maxLength={10} autoComplete="postal-code" invalid={!!errors.pincode} {...register('pincode')} />
          </Field>
          <Field label="Office Address" required error={errors.address?.message} htmlFor="address" className="md:col-span-2">
            <Input id="address" placeholder="Building / floor, street, area" autoComplete="street-address" invalid={!!errors.address} {...register('address')} />
          </Field>
        </Section>

        <Section icon={Phone} title="Official Contact" description="Where HumanCare sends verification and billing communication.">
          <Field label="Official Email" required error={errors.officialEmail?.message} htmlFor="officialEmail" hint="Verification email is sent here">
            <Input id="officialEmail" type="email" placeholder="e.g. accounts@yourcompany.com" autoComplete="email" invalid={!!errors.officialEmail} {...register('officialEmail')} />
          </Field>
          <Field label="Official Phone Number" required error={errors.officialPhone?.message} htmlFor="officialPhone">
            <Input id="officialPhone" type="tel" prefix={dial} placeholder={country === 'IN' ? 'Office number with STD code, e.g. 22 4567 8900' : 'Office phone number'} autoComplete="tel" invalid={!!errors.officialPhone} {...register('officialPhone')} />
          </Field>
        </Section>
      </div>
      {footer({ submitting: isSubmitting, getValues })}
    </form>
  );
}
