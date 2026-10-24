import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { KeyRound } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, PasswordInput } from '@/components/ui/Input';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Alert } from '@/components/ui/Misc';
import { PageLoader } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks/useUtils';
import { resetPasswordSchema } from '@/utils/schemas';
import { maskEmail } from '@/utils/mask';
import { useCurrentRegistration } from './useCurrentRegistration';

export default function CredentialsPage() {
  useDocumentTitle('Create Credentials');
  const navigate = useNavigate();
  const toast = useToast();
  const { data: reg, loading } = useCurrentRegistration();

  const { register, handleSubmit, watch, formState } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (loading || !reg) return <PageLoader label="Loading…" />;
  if (!reg.emailVerified || !reg.approved) return <Navigate to="/register/verify-email" replace />;
  if (reg.credentialsCreated) return <Navigate to="/register/success" replace />;

  const password = watch('password') ?? '';
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async ({ password: pw }) => {
    try {
      await registrationService.createCredentials(reg.id, pw);
      toast.success('Account created', 'Your corporate account is now active.');
      navigate('/register/success');
    } catch (e) {
      toast.error('Could not create the account', e instanceof Error ? e.message : undefined);
    }
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create your login</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the password you'll use to sign in to the Corporate Portal with your registered email.</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">Corporate ID</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-slate-900">{reg.corporateId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Registered Email (your login)</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{maskEmail(reg.email)}</dd>
          </div>
        </dl>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <Field label="Password" required htmlFor="password" error={errors.password?.message}>
            <PasswordInput id="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
          </Field>
          <PasswordStrength password={password} />
          <Field label="Confirm Password" required htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="!mt-6">
            Create Account
          </Button>
        </form>
      </Card>
    </div>
  );
}
