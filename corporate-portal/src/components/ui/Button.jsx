import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from './Loading';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  outline: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  link: 'text-brand-600 hover:text-brand-700 hover:underline underline-offset-4',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
  icon: 'h-9 w-9',
};

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className = '' } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
    'disabled:pointer-events-none disabled:opacity-55',
    VARIANTS[variant],
    variant === 'link' ? 'h-auto px-0' : SIZES[size],
    fullWidth && 'w-full',
    className,
  );
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, fullWidth, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
