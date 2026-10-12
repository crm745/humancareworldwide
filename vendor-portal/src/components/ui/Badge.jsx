import { cn } from '@/utils/cn';

const TONES = {
  gray: { box: 'bg-slate-100 text-slate-700 ring-slate-500/15', dot: 'bg-slate-400' },
  blue: { box: 'bg-brand-50 text-brand-700 ring-brand-600/15', dot: 'bg-brand-500' },
  indigo: { box: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15', dot: 'bg-indigo-500' },
  violet: { box: 'bg-violet-50 text-violet-700 ring-violet-600/15', dot: 'bg-violet-500' },
  green: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  amber: { box: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  orange: { box: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500' },
  red: { box: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
};

export function Badge({ tone = 'gray', dot = false, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone].box,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', TONES[tone].dot)} />}
      {children}
    </span>
  );
}

// One place that decides the colour of every status / priority label in the portal.
const STATUS_TONES = {
  // cases
  Submitted: 'blue',
  Scheduled: 'violet',
  'In Progress': 'amber',
  Completed: 'green',
  Cancelled: 'gray',
  // priority
  Low: 'gray',
  Medium: 'blue',
  High: 'orange',
  Emergency: 'red',
  Urgent: 'red',
  // documents / verification
  Uploaded: 'blue',
  Pending: 'amber',
  'Pending Verification': 'amber',
  Verified: 'green',
  Expired: 'orange',
  Rejected: 'red',
  Active: 'green',
  // invoices
  Paid: 'green',
  Overdue: 'red',
  // tickets
  Open: 'blue',
  Resolved: 'green',
  Closed: 'gray',
  // services
  Available: 'green',
  'On Request': 'blue',
  'Limited Availability': 'amber',
};

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'gray'} dot className={className}>
      {status}
    </Badge>
  );
}
