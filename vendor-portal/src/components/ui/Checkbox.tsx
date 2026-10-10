import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; invalid?: boolean }>(
  function Checkbox({ label, invalid, className, ...props }, ref) {
    return (
      <label className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-slate-700', className)}>
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
            invalid && 'outline outline-2 outline-red-400',
          )}
          {...props}
        />
        <span className="leading-5">{label}</span>
      </label>
    );
  },
);

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-slate-300',
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
  if (!label && !description) return control;
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <p className="text-sm font-medium text-slate-800">{label}</p>}
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {control}
    </div>
  );
}
