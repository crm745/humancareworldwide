import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Ambulance, Clock, Globe2, HeartHandshake, Hospital, Plane, Stethoscope, TrainFront } from 'lucide-react';

import { SERVICES } from '@/data/constants';
import { vendorService } from '@/services/vendorService';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { serviceRequestSchema } from '@/utils/schemas';

const ICONS = {
  'Air Ambulance': Plane,
  'Ground Ambulance': Ambulance,
  'Train Ambulance': TrainFront,
  'Hospital Transfer': Hospital,
  'Medical Escort': HeartHandshake,
  'Private Medical Assistance': Stethoscope,
};

const today = () => new Date().toISOString().slice(0, 10);

function RequestServiceModal({ service, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      patientName: '',
      age: '',
      gender: 'Male',
      pickup: '',
      destination: '',
      preferredDate: today(),
      priority: 'Medium',
      contactPhone: '',
      notes: '',
    },
  });
  const { errors, isSubmitting } = formState;

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    if (!service) return;
    try {
      const created = await vendorService.createCase({ ...v, age: Number(v.age), service, notes: v.notes ?? '' });
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
        <Field label="Preferred Date" required error={errors.preferredDate?.message} htmlFor="rq-date">
          <Input id="rq-date" type="date" min={today()} invalid={!!errors.preferredDate} {...register('preferredDate')} />
        </Field>
        <Field label="Priority" required htmlFor="rq-priority">
          <Select id="rq-priority" options={['Low', 'Medium', 'High', 'Emergency']} {...register('priority')} />
        </Field>
        <Field label="Contact Phone" required error={errors.contactPhone?.message} htmlFor="rq-phone" className="sm:col-span-2">
          <Input id="rq-phone" type="tel" placeholder="+91 98765 43210" invalid={!!errors.contactPhone} {...register('contactPhone')} />
        </Field>
        <Field label="Notes for the medical team" error={errors.notes?.message} htmlFor="rq-notes" className="sm:col-span-2">
          <Textarea
            id="rq-notes"
            rows={3}
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
  return (
    <div>
      <PageHeader title="Services" description="Medical transport and assistance services available to your organisation, 24×7." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {SERVICES.map((s) => {
          const Icon = ICONS[s.type];
          return (
            <article
              key={s.type}
              className="group flex flex-col rounded-xl border border-slate-200/80 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <StatusBadge status={s.status} />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">{s.type}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">{s.description}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> {s.responseTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5 text-slate-400" /> {s.coverage}
                </span>
              </div>
              <Button className="mt-5" fullWidth variant={s.status === 'Available' ? 'primary' : 'outline'} onClick={() => setRequesting(s.type)}>
                Request Service
              </Button>
            </article>
          );
        })}
      </div>
      <RequestServiceModal service={requesting} onClose={() => setRequesting(null)} />
    </div>
  );
}
