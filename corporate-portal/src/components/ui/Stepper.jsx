import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Horizontal stepper on tablet/desktop; compact "Step x of y" + progress bar on phones. */
export function Stepper({ steps, current }) {
  const pct = Math.round((current / (steps.length - 1)) * 100);
  return (
    <div>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Step {current + 1} of {steps.length}
          </p>
          <p className="text-xs text-slate-500">{pct}% complete</p>
        </div>
        <p className="mt-1 text-base font-semibold text-slate-900">{steps[current]?.label}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${Math.max(pct, 6)}%` }} />
        </div>
      </div>

      <ol className="hidden items-start sm:flex" aria-label="Registration progress">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.label} className="relative flex flex-1 flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
              {i > 0 && (
                // Runs centre-to-centre from the previous step; the circles sit on top of it.
                <span className="absolute right-1/2 top-[15px] h-0.5 w-full bg-slate-200" aria-hidden="true">
                  <span className={cn('block h-full bg-brand-600 transition-[width] duration-500', i <= current ? 'w-full' : 'w-0')} />
                </span>
              )}
              <span
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-colors',
                  done && 'bg-brand-600 text-white',
                  active && 'bg-white text-brand-700 ring-2 ring-brand-600 ring-offset-2',
                  !done && !active && 'bg-white text-slate-400 ring-1 ring-slate-300',
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('mt-2.5 px-1 text-[13px] font-semibold', active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400')}>
                {step.label}
              </span>
              {step.description && <span className="mt-0.5 hidden px-2 text-xs text-slate-400 lg:block">{step.description}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
