import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Alert } from '@/components/ui/Misc';
import { PageLoader, Spinner } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks/useUtils';
import { credentialsSchema } from '@/utils/schemas';
import { maskEmail } from '@/utils/mask';
import { USERNAME_RE } from '@/utils/validators';
import { useCurrentRegistration } from './useCurrentRegistration';

type Values = z.input<typeof credentialsSchema>;

const suggestUsername = (company: string) =>
  company
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llc|inc|fze|co)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .split('.')
    .slice(0, 2)
    .join('.')
    .concat('.admin')
    .slice(0, 30);

export default function CredentialsPage() {
  useDocumentTitle('Create Credentials');
  const navigate = useNavigate();
  const toast = useToast();
  const { data: reg, loading } = useCurrentRegistration();
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, setError: setFieldError, formState } = useForm<Values>({
    resolver: zodResolver(credentialsSchema),
    mode: 'onTouched',
    values: reg ? { username: reg.username ?? suggestUsername(reg.company.companyName), password: '', confirmPassword: '' } : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  if (loading || !reg) return <PageLoader label="Loading…" />;
  if (!reg.emailVerified || !reg.approved) return <Navigate to="/register/verify-email" replace />;
  if (reg.credentialsCreated) return <Navigate to="/register/success" replace />;

  const password = watch('password') ?? '';
  const { errors, isSubmitting } = formState;

  const checkUsername = async (raw: string) => {
    const name = raw.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    setAvailability((await registrationService.isUsernameAvailable(name)) ? 'available' : 'taken');
  };

  const onSubmit = handleSubmit(async ({ username, password: pw }) => {
    setError('');
    const name = username.trim().toLowerCase();
    if (!(await registrationService.isUsernameAvailable(name))) {
      setAvailability('taken');
      setFieldError('username', { message: 'That username is already taken' });
      return;
    }
    try {
      await registrationService.createCredentials(reg.id, name, pw);
      toast.success('Account created', 'Your vendor account is now active.');
      navigate('/register/success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account.');
    }
  });

  const usernameField = register('username', { onBlur: (e) => checkUsername(e.target.value), onChange: () => setAvailability('idle') });

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create your login</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the username and password you’ll use to sign in to the Vendor Portal.</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500">Vendor ID</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-slate-900">{reg.vendorId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Username</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{watch('username') || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Registered Email</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{maskEmail(reg.email)}</dd>
          </div>
        </dl>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <Field
            label="Username"
            required
            htmlFor="username"
            error={errors.username?.message ?? (availability === 'taken' ? 'That username is already taken' : undefined)}
            hint={
              availability === 'checking' ? (
                <span className="inline-flex items-center gap-1.5"><Spinner className="h-3 w-3" /> Checking availability…</span>
              ) : availability === 'available' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Username is available</span>
              ) : (
                '4–30 characters: lowercase letters, numbers, “.”, “_” or “-”'
              )
            }
          >
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              invalid={!!errors.username || availability === 'taken'}
              rightSlot={availability === 'taken' ? <XCircle className="mr-1.5 h-4 w-4 text-red-500" /> : availability === 'available' ? <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" /> : undefined}
              {...usernameField}
            />
          </Field>
          <Field label="Password" required htmlFor="password" error={errors.password?.message}>
            <PasswordInput id="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
          </Field>
          <PasswordStrength password={password} />
          <Field label="Confirm Password" required htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="!mt-6">
            Create Account
          </Button>
        </form>
      </Card>
    </div>
  );
}
