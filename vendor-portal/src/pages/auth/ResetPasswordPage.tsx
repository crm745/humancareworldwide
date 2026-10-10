import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, KeyRound, LinkIcon } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Field, PasswordInput } from '@/components/ui/Input';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Alert } from '@/components/ui/Misc';
import { useDocumentTitle } from '@/hooks/useUtils';
import { authService } from '@/services/authService';
import { resetPasswordSchema } from '@/utils/schemas';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset Password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError('');
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset the password.');
    }
  });

  return (
    <AuthLayout>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>

      {!token ? (
        <div className="mt-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <LinkIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Invalid reset link</h1>
          <p className="mt-2 text-sm text-slate-500">This link is missing its security token or has already been used. Request a new one to continue.</p>
          <Link to="/forgot-password" className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-8' })}>
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <div className="mt-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Password updated</h1>
          <p className="mt-2 text-sm text-slate-500">Your password has been reset. You can now sign in with your new password.</p>
          <Link to="/login" className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-8' })}>
            Go to Vendor Login
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Set a new password</h1>
          <p className="mt-1.5 text-sm text-slate-500">Choose a strong password you haven’t used before.</p>
          {error && (
            <Alert tone="error" className="mt-5" action={<Link to="/forgot-password" className="text-xs font-semibold underline">New link</Link>}>
              {error}
            </Alert>
          )}
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <Field label="New Password" required htmlFor="password" error={formState.errors.password?.message}>
              <PasswordInput id="password" autoComplete="new-password" invalid={!!formState.errors.password} {...register('password')} />
            </Field>
            <PasswordStrength password={watch('password')} />
            <Field label="Confirm New Password" required htmlFor="confirmPassword" error={formState.errors.confirmPassword?.message}>
              <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={!!formState.errors.confirmPassword} {...register('confirmPassword')} />
            </Field>
            <Button type="submit" size="lg" fullWidth loading={formState.isSubmitting} className="!mt-6">
              Reset Password
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
