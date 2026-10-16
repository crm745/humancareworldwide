import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ChevronDown, Headphones, LifeBuoy, Mail, MessageSquarePlus, Phone, Send, TicketCheck } from 'lucide-react';

import { FAQS, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_TEL, TICKET_CATEGORIES } from '@/data/constants';
import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/Table';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FileUpload } from '@/components/ui/FileUpload';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { ticketSchema } from '@/utils/schemas';
import { formatDateTime, relativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

function NewTicketModal({ open, initialSubject, onClose, onCreated }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const { register, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: '', category: '', priority: 'Medium', description: '' },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) {
      reset({ subject: initialSubject, category: initialSubject ? 'Case Operations' : '', priority: 'Medium', description: '' });
      setFile(null);
    }
  }, [open, initialSubject, reset]);

  const submit = handleSubmit(async (v) => {
    try {
      const t = await corporateService.createTicket({ ...v, attachmentName: file?.name });
      onCreated(t);
      toast.success('Ticket created', `${t.id} — our support team typically replies within 4 business hours.`);
      onClose();
    } catch (e) {
      toast.error('Could not create ticket', e instanceof Error ? e.message : undefined);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      size="lg"
      title="Create support ticket"
      description="Tell us what you need help with."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isSubmitting} leftIcon={<Send className="h-4 w-4" />}>
            Submit Ticket
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject" required error={errors.subject?.message} htmlFor="tk-subject" className="sm:col-span-2">
          <Input id="tk-subject" placeholder="Short summary of the issue" invalid={!!errors.subject} {...register('subject')} />
        </Field>
        <Field label="Category" required error={errors.category?.message} htmlFor="tk-category">
          <Select id="tk-category" placeholder="Select category" options={TICKET_CATEGORIES} invalid={!!errors.category} {...register('category')} />
        </Field>
        <Field label="Priority" required htmlFor="tk-priority">
          <Select id="tk-priority" options={['Low', 'Medium', 'High', 'Urgent']} {...register('priority')} />
        </Field>
        <Field label="Description" required error={errors.description?.message} htmlFor="tk-desc" className="sm:col-span-2">
          <Textarea
            id="tk-desc"
            rows={5}
            placeholder="Include case IDs, invoice numbers or steps to reproduce…"
            invalid={!!errors.description}
            {...register('description')}
          />
        </Field>
        <div className="sm:col-span-2">
          <FileUpload label="Attachment" description="Optional screenshot or document" value={file} onChange={setFile} disabled={isSubmitting} />
        </div>
      </form>
    </Modal>
  );
}

function TicketModal({ ticket, onClose, onUpdated }) {
  const toast = useToast();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    setReply('');
  }, [ticket?.id]);
  const send = async () => {
    if (!ticket || reply.trim().length < 2) return;
    setSending(true);
    try {
      const t = await corporateService.replyTicket(ticket.id, reply.trim());
      onUpdated(t);
      setReply('');
      toast.success('Reply sent');
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal open={!!ticket} onClose={onClose} size="lg" title={ticket?.subject} description={ticket ? `${ticket.id} · ${ticket.category}` : undefined}>
      {ticket && (
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={ticket.status} />
            <StatusBadge status={ticket.priority} />
            {ticket.attachmentName && <span className="text-xs text-slate-500">📎 {ticket.attachmentName}</span>}
          </div>
          <ol className="mt-5 space-y-4">
            {ticket.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'max-w-[90%] rounded-xl px-4 py-3 text-sm',
                  m.from === 'corporate' ? 'ml-auto bg-brand-600 text-white' : 'bg-slate-100 text-slate-800',
                )}
              >
                <p className="leading-relaxed">{m.body}</p>
                <p className={cn('mt-1.5 text-[11px]', m.from === 'corporate' ? 'text-brand-100' : 'text-slate-500')}>
                  {m.author} · {formatDateTime(m.date)}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <Textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={ticket.status === 'Closed' ? 'Replying will re-open this ticket…' : 'Write a reply…'}
              aria-label="Reply"
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={send} loading={sending} disabled={reply.trim().length < 2} leftIcon={<Send className="h-4 w-4" />}>
                Send Reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function SupportPage() {
  useDocumentTitle('Support');
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload, setData } = useAsync(() => corporateService.listTickets(), []);
  const [newOpen, setNewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [prefill, setPrefill] = useState('');

  // "Contact Support" from a case page arrives with ?subject=… — just lands on this
  // page (no longer auto-opens the ticket modal); the subject is still remembered so
  // it's pre-filled if the person opens "New Ticket" themselves.
  useEffect(() => {
    const subject = params.get('subject');
    if (subject) {
      setPrefill(subject);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const upsert = (t) => setData((prev) => [t, ...(prev ?? []).filter((x) => x.id !== t.id)]);

  const options = [
    {
      icon: MessageSquarePlus,
      title: 'Create Support Ticket',
      text: 'Raise a request and track it here.',
      action: () => {
        setPrefill('');
        setNewOpen(true);
      },
      cta: 'New ticket',
    },
    {
      icon: Headphones,
      title: 'Contact HumanCare Support',
      text: 'Talk to the corporate relations desk.',
      action: () => setContactOpen(true),
      cta: 'View contacts',
    },
    {
      icon: Mail,
      title: 'Email Support',
      text: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Corporate Portal support')}`,
      cta: 'Send email',
    },
    { icon: Phone, title: 'Call Support (24×7)', text: SUPPORT_PHONE, href: `tel:${SUPPORT_TEL}`, cta: 'Call now' },
  ];

  const columns = [
    { key: 'id', header: 'Ticket ID', sortable: true, render: (t) => <span className="font-mono text-[13px] text-slate-600">{t.id}</span> },
    { key: 'subject', header: 'Subject', primary: true, wrap: true, render: (t) => <span className="font-medium text-slate-900">{t.subject}</span> },
    { key: 'category', header: 'Category', hideOnMobile: true, className: 'hidden 2xl:table-cell' },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
    { key: 'status', header: 'Status', sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'updatedAt', header: 'Last Update', sortable: true, render: (t) => relativeTime(t.updatedAt) },
  ];

  return (
    <div>
      <PageHeader title="Support" description="We’re here 24×7 for operations, billing and account questions." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {options.map((o) => {
          const inner = (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <o.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">{o.title}</p>
              <p className="mt-1 truncate text-[13px] text-slate-500">{o.text}</p>
              <p className="mt-3 text-[13px] font-medium text-brand-600">{o.cta} →</p>
            </>
          );
          const cls =
            'block rounded-xl border border-slate-200/80 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md';
          return o.href ? (
            <a key={o.title} href={o.href} className={cls}>
              {inner}
            </a>
          ) : (
            <button key={o.title} type="button" onClick={o.action} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="My Tickets"
            description="Open, In Progress, Resolved and Closed requests"
            action={
              <Button
                size="sm"
                leftIcon={<MessageSquarePlus className="h-4 w-4" />}
                onClick={() => {
                  setPrefill('');
                  setNewOpen(true);
                }}
              >
                New Ticket
              </Button>
            }
          />
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <DataTable
              data={data ?? []}
              columns={columns}
              rowKey={(t) => t.id}
              loading={loading}
              pageSize={6}
              onRowClick={setViewing}
              empty={<EmptyState icon={TicketCheck} title="No tickets yet" description="Tickets you raise will appear here." />}
            />
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Frequently Asked Questions" />
          <ul className="divide-y divide-slate-100">
            {FAQS.map((f, i) => (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-medium text-slate-900">{f.q}</span>
                  <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && <p className="animate-fade-in px-5 pb-4 text-[13px] leading-relaxed text-slate-600">{f.a}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <NewTicketModal open={newOpen} initialSubject={prefill} onClose={() => setNewOpen(false)} onCreated={upsert} />
      <TicketModal
        ticket={viewing}
        onClose={() => setViewing(null)}
        onUpdated={(t) => {
          upsert(t);
          setViewing(t);
        }}
      />
      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Contact HumanCare Support" size="sm">
        <ul className="space-y-3">
          <li>
            <a href={`tel:${SUPPORT_TEL}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
              <Phone className="h-5 w-5 text-brand-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">24×7 Operations Desk</span>
                <span className="block text-[13px] text-slate-500">{SUPPORT_PHONE}</span>
              </span>
            </a>
          </li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
              <Mail className="h-5 w-5 text-brand-600" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">Corporate Relations</span>
                <span className="block truncate text-[13px] text-slate-500">{SUPPORT_EMAIL}</span>
              </span>
            </a>
          </li>
          <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-[13px] text-slate-600">
            <LifeBuoy className="h-5 w-5 text-slate-400" /> Medical emergencies are handled 24×7 on the operations line.
          </li>
        </ul>
      </Modal>
    </div>
  );
}
