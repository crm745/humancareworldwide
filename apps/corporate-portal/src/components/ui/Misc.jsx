import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, Info, Lock, TriangleAlert } from 'lucide-react';
import logo from '@/assets/logo.png';
import logoMark from '@/assets/logo-mark.png';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import { useClickOutside } from '@/hooks/useUtils';

export function Logo({ className }) {
  return <img src={logo} alt="HumanCare World Wide" className={cn('h-9 w-auto select-none', className)} draggable={false} />;
}

// Just the HL wings, for spaces too small for the full logo (collapsed sidebar).
export function LogoMark({ className }) {
  return <img src={logoMark} alt="HumanCare World Wide" className={cn('h-7 w-auto select-none', className)} draggable={false} />;
}

export function PageHeader({ title, description, actions, breadcrumbs }) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-slate-500" aria-label="Breadcrumb">
          {breadcrumbs.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
              {b.to ? (
                <Link to={b.to} className="hover:text-brand-600">
                  {b.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-700">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Avatar({ name, size = 'md', className }) {
  const s = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-[13px]', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-xl' }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700', s, className)}>
      {initials(name) || '?'}
    </span>
  );
}

/** The "your bank details are protected" note shown wherever bank data appears. */
export function SecureNote({ className, children }) {
  return (
    <div
      className={cn('flex items-start gap-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-3 text-[13px] text-emerald-800', className)}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children ?? 'Your banking information is securely protected. Account numbers are encrypted and only the last 4 digits are ever displayed.'}</span>
    </div>
  );
}

const ALERT = {
  info: { icon: Info, cls: 'border-brand-200 bg-brand-50/70 text-brand-900', ic: 'text-brand-600' },
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', ic: 'text-emerald-600' },
  warning: { icon: TriangleAlert, cls: 'border-amber-200 bg-amber-50/70 text-amber-900', ic: 'text-amber-600' },
  error: { icon: AlertCircle, cls: 'border-red-200 bg-red-50/70 text-red-900', ic: 'text-red-600' },
};

export function Alert({ tone = 'info', title, children, className, action }) {
  const { icon: Icon, cls, ic } = ALERT[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-[13px]', cls, className)} role={tone === 'error' ? 'alert' : undefined}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ic)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('leading-relaxed', title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('-mb-px flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            value === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-px text-[11px] font-semibold',
                value === t.key ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Button-triggered popover menu that closes on outside click. */
export function Dropdown({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 animate-scale-in rounded-xl border border-slate-200 bg-white py-1.5 shadow-elevated',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Segmented control (e.g. dashboard date filter, bank type). */
export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-1', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'whitespace-nowrap rounded-md font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            value === o.key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
