import { Link } from 'react-router-dom';

import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Card({ className, children }) {
  return <div className={cn('rounded-xl border border-slate-200/80 bg-white shadow-card', className)}>{children}</div>;
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

const ICON_TONES = {
  blue: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
  teal: 'bg-teal-50 text-teal-600',
};

export function StatCard({ label, value, icon: Icon, tone = 'blue', hint, to }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', ICON_TONES[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {to && <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />}
      </div>
      <p className="mt-4 text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = 'group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-card transition';
  return to ? (
    <Link
      to={to}
      className={cn(
        cls,
        'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Label / value rows for detail pages. */
export function InfoGrid({ items, cols = 2 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3')}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{it.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-800">{it.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
