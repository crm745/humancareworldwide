import { Check, Circle } from 'lucide-react';
import { passwordChecks } from '@/utils/validators';
import { cn } from '@/utils/cn';

const LEVELS = [
  { label: 'Too weak', bar: 'bg-red-500', text: 'text-red-600' },
  { label: 'Weak', bar: 'bg-red-500', text: 'text-red-600' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Good', bar: 'bg-brand-500', text: 'text-brand-600' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600' },
];

export function PasswordStrength({ password }: { password: string }) {
  const checks = passwordChecks(password);
  const passed = checks.filter((c) => c.ok).length;
  // 5 rules → 4 bar segments; long passwords that pass everything read as "Strong".
  const score = !password ? 0 : passed === 5 ? (password.length >= 12 ? 4 : 3) : Math.max(1, passed - 1);
  const level = LEVELS[score];
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Password strength</span>
        <span className={cn('font-semibold', password ? level.text : 'text-slate-400')}>{password ? level.label : '—'}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1.5 rounded-full transition-colors', i <= score ? level.bar : 'bg-slate-200')} />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className={cn('flex items-center gap-2 text-xs', c.ok ? 'text-emerald-700' : 'text-slate-500')}>
            {c.ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Circle className="h-3 w-3" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
