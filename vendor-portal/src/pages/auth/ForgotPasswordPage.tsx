import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Misc';
import { useDocumentTitle } from '@/hooks/useUtils';
import { authService } from '@/services/authService';
import { USE_MOCK_API } from '@/services/config';
import { emailOnlySchema } from '@/utils/schemas';
import { maskEmail } from '@/utils/mask';

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password');
  const [sentTo, setSentTo] = useState('');
  const [resetToken, setResetToken] = useState<string>();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError('');
    try {
      const res = await authService.forgotPassword(email);
      setResetToken(res.resetToken);
      setSentTo(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  });

  return (
    <AuthLayout>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>

      {sentTo ? (
        <div className="mt-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Check your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            If an account exists for <span className="font-medium text-slate-700">{maskEmail(sentTo)}</span>, you’ll receive a password reset link shortly. The link expires in 1 hour.
          </p>
          {USE_MOCK_API && (
            <Alert tone="info" className="mt-6" title="Demo mode — no real email is sent">
              {resetToken ? (
                <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="font-semibold text-brand-700 underline underline-offset-2">
                  Open the reset link
                </Link>
              ) : (
                'No portal account uses this email. Try the demo account’s email: ananya.mehta@medicorpglobal.com'
              )}
            </Alert>
          )}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Link to="/login" className={buttonClasses({ variant: 'primary', size: 'lg', className: 'flex-1' })}>
              Return to login
            </Link>
            <Button variant="outline" size="lg" onClick={() => setSentTo('')}>
              Use another email
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Forgot your password?</h1>
          <p className="mt-1.5 text-sm text-slate-500">Enter your registered email and we’ll send you a link to reset it.</p>
          {error && (
            <Alert tone="error" className="mt-5">
              {error}
            </Alert>
          )}
          <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
            <Field label="Registered Email" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" placeholder="name@company.com" leftIcon={<Mail className="h-4 w-4" />} invalid={!!formState.errors.email} {...register('email')} />
            </Field>
            <Button type="submit" size="lg" fullWidth loading={formState.isSubmitting}>
              Send Reset Link
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
