import { forwardRef, useId, useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export const fieldBase =
  'w-full rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
export const fieldState = (invalid) =>
  invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
    : 'border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/15';

/** Label + control + hint/error, with the required asterisk. */
export function Field({ label, required, error, hint, htmlFor, className, children }) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-600" role="alert">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ invalid, leftIcon, prefix, rightSlot, className, ...props }, ref) {
  return (
    <div className="relative flex">
      {prefix && (
        <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-600">
          {prefix}
        </span>
      )}
      <div className="relative min-w-0 flex-1">
        {leftIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(fieldBase, fieldState(invalid), 'h-10 px-3', leftIcon && 'pl-9', rightSlot && 'pr-10', prefix && 'rounded-l-none', className)}
          {...props}
        />
        {rightSlot && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
    </div>
  );
});

export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, fieldState(invalid), 'px-3 py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
});

/** Stable id for label ↔ input wiring. */
export const useFieldId = (name) => `${name}-${useId().replace(/:/g, '')}`;
