import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Ambulance, Armchair, Building2, Flower2, Hospital, HousePlus, PlaneTakeoff, Stethoscope, Video } from 'lucide-react';

import { CARE_LEVELS, CARE_LEVEL_SERVICES, COUNTRIES } from '@/data/constants';
import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { CardsSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { serviceRequestSchema } from '@/utils/schemas';

// Keyed by the same slug the backend's admin-managed Service table and the mobile
// app both use — falls back to a generic icon for any service added later.
const ICONS = {
  ground: Ambulance,
  hospital: Hospital,
  privatecharter: PlaneTakeoff,
  commercialair: Armchair, // airline seat — reads as "escorted commercial flight" faster than a generic person icon
  mortal: Flower2,
  homecare: HousePlus, // house + medical cross, more specific than a plain home icon
  tele: Video,
  corporate: Building2,
};

// Same order the mobile app shows these in: the Home screen's 7-tile grid (see
// mobile/src/data/mock.js SERVICE_TILES), with "Air Ambulance" expanded into its two
// real options in the order mobile's own air-ambulance-options screen lists them
// (Private Charter, then Commercial Escort) — mobile has no single "air" service of
// its own, it's just a picker screen between those two.
const SERVICE_ORDER = ['privatecharter', 'commercialair', 'ground', 'hospital', 'mortal', 'homecare', 'tele', 'corporate'];
function bySequence(services) {
  return [...services].sort((a, b) => {
    const ia = SERVICE_ORDER.indexOf(a.slug);
    const ib = SERVICE_ORDER.indexOf(b.slug);
    return (ia === -1 ? SERVICE_ORDER.length : ia) - (ib === -1 ? SERVICE_ORDER.length : ib);
  });
}

const today = () => new Date().toISOString().slice(0, 10);

// 🇮🇳 from 'IN' — regional-indicator Unicode trick, no flag image assets needed.
function flagEmoji(isoCode) {
  return [...isoCode.toUpperCase()].map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
}

// One option per unique dial code — flagged with the first country (in COUNTRIES'
// India/GCC/UK/US-first order) that uses it. Who's calling the patient, independent
// of the company's own country.
const DIAL_CODE_OPTIONS = (() => {
  const seen = new Set();
  const options = [];
  for (const c of COUNTRIES) {
    if (!c.dial || seen.has(c.dial)) continue;
    seen.add(c.dial);
    options.push({ value: c.dial, label: `${flagEmoji(c.code)} ${c.dial}` });
  }
  return options;
})();

// Field set, order and requiredness match the mobile app's request flow exactly
// (request/step1.js for the first section, step2.js for "Additional Information").
function RequestServiceModal({ service, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      service: '',
      patientName: '',
      age: '',
      gender: 'Male',
      pickup: '',
      destination: '',
      preferredDate: today(),
      careLevel: [],
      contactCountryCode: '+91',
      contactPhone: '',
      description: '',
      notes: '',
    },
  });
  const { errors, isSubmitting } = formState;

  // Reset the whole form each time a different service is opened, so stale input from
  // a previously-requested service never carries over.
  useEffect(() => {
    if (!service) return;
    reset({
      service,
      patientName: '',
      age: '',
      gender: 'Male',
      pickup: '',
      destination: '',
      preferredDate: today(),
      careLevel: [],
      contactCountryCode: '+91',
      contactPhone: '',
      description: '',
      notes: '',
    });
    setFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the requested service changes
  }, [service]);

  const careLevel = watch('careLevel');
  const needsCareLevel = CARE_LEVEL_SERVICES.includes(service);

  // Matches the mobile app's toggleCareLevel (components/ui.js): ICU/Stable/Ambulatory
  // can be combined with each other, but "Not Applicable" is mutually exclusive with
  // all of them — picking it clears the rest, picking anything else drops it.
  const toggleCareLevel = (key) => {
    let next;
    if (careLevel.includes(key)) next = careLevel.filter((k) => k !== key);
    else if (key === 'care_na') next = ['care_na'];
    else next = [...careLevel.filter((k) => k !== 'care_na'), key];
    setValue('careLevel', next, { shouldValidate: true });
  };

  const close = () => {
    reset();
    setFile(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    if (!service) return;
    try {
      const created = await corporateService.createCase({ ...v, file: file?.file ?? null });
      toast.success('Request submitted', `${created.id} — our operations desk will call you shortly.`);
      close();
      navigate(`/cases/${created.id}`);
    } catch (e) {
      toast.error('Could not submit request', e instanceof Error ? e.message : undefined);
    }
  });

  return (
    <Modal
      open={!!service}
      onClose={close}
      dismissible={!isSubmitting}
      size="lg"
      title={`Request ${service ?? ''}`}
      description="Share the essentials — our medical coordinator will confirm the details with you by phone."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={isSubmitting}>
            Submit Request
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Patient Name" required error={errors.patientName?.message} htmlFor="rq-name" className="sm:col-span-2">
          <Input id="rq-name" placeholder="Full name as per passport" invalid={!!errors.patientName} {...register('patientName')} />
        </Field>
        <Field label="Age" required error={errors.age?.message} htmlFor="rq-age">
          <Input id="rq-age" inputMode="numeric" maxLength={3} placeholder="Years" invalid={!!errors.age} {...register('age')} />
        </Field>
        <Field label="Gender" required htmlFor="rq-gender">
          <Select id="rq-gender" options={['Male', 'Female', 'Other']} {...register('gender')} />
        </Field>
        <Field label="Pickup Location" required error={errors.pickup?.message} htmlFor="rq-pickup">
          <Input id="rq-pickup" placeholder="Hospital / address, city" invalid={!!errors.pickup} {...register('pickup')} />
        </Field>
        <Field label="Destination" required error={errors.destination?.message} htmlFor="rq-dest">
          <Input id="rq-dest" placeholder="Hospital / address, city" invalid={!!errors.destination} {...register('destination')} />
        </Field>
        <Field label="Contact Phone" error={errors.contactPhone?.message} htmlFor="rq-phone" className="sm:col-span-2">
          <div className="flex gap-2">
            <Select aria-label="Country code" className="w-32 shrink-0" options={DIAL_CODE_OPTIONS} {...register('contactCountryCode')} />
            <Input id="rq-phone" type="tel" placeholder="98765 43210" invalid={!!errors.contactPhone} {...register('contactPhone')} />
          </div>
        </Field>

        {needsCareLevel && (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-medium text-slate-700">
              Care Level <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CARE_LEVELS.map((c) => (
                <Checkbox key={c.key} label={c.label} checked={careLevel.includes(c.key)} onChange={() => toggleCareLevel(c.key)} />
              ))}
            </div>
            {errors.careLevel && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.careLevel.message}</p>}
          </div>
        )}

        <Field label="Preferred Date" required error={errors.preferredDate?.message} htmlFor="rq-date">
          <Input id="rq-date" type="date" min={today()} invalid={!!errors.preferredDate} {...register('preferredDate')} />
        </Field>
        <Field label="Requirement Description" error={errors.description?.message} htmlFor="rq-description" className="sm:col-span-2">
          <Textarea
            id="rq-description"
            rows={2}
            placeholder="e.g. Patient needs a stable transfer to a cardiac hospital"
            invalid={!!errors.description}
            {...register('description')}
          />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[13px] font-medium text-slate-700">Upload Medical Report</p>
          <FileUpload label="" value={file} onChange={setFile} />
        </div>

        <Field label="Notes for the medical team" error={errors.notes?.message} htmlFor="rq-notes" className="sm:col-span-2">
          <Textarea
            id="rq-notes"
            rows={2}
            placeholder="Condition, equipment needed, insurance / GOP details…"
            invalid={!!errors.notes}
            {...register('notes')}
          />
        </Field>
      </form>
    </Modal>
  );
}

export default function ServicesPage() {
  useDocumentTitle('Services');
  const [requesting, setRequesting] = useState(null);
  const { data: services, loading, error, reload } = useAsync(() => corporateService.listServices(), []);

  return (
    <div>
      <PageHeader title="Services" description="Medical transport and assistance services available to your organisation, 24×7." />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !services ? (
        <CardsSkeleton count={6} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {bySequence(services).map((s) => {
            const Icon = ICONS[s.slug] || Stethoscope;
            return (
              <article
                key={s.slug}
                className="group flex flex-col items-center rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-10 w-10" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 flex-1 text-base font-semibold text-slate-900">{s.name}</h3>
                <Button className="mt-5" fullWidth onClick={() => setRequesting(s.name)}>
                  Request Service
                </Button>
              </article>
            );
          })}
        </div>
      )}
      <RequestServiceModal service={requesting} onClose={() => setRequesting(null)} />
    </div>
  );
}
