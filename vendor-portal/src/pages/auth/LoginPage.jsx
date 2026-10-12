import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ArrowRight, Lock, Sparkles, User } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input, PasswordInput } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useUtils';
import { USE_MOCK_API } from '@/services/config';
import { MOCK_DEMO_ACCOUNT } from '@/services/authService';
import { loginSchema } from '@/utils/schemas';

export default function LoginPage() {
  useDocumentTitle('Vendor Login');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState('');

  const from = location.state?.from ?? '/dashboard';
  const prefill = params.get('username') ?? '';

  const { register, handleSubmit, setValue, formState } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: prefill, password: '', remember: true },
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async ({ identifier, password, remember }) => {
    setError('');
    try {
      const result = await login(identifier, password, remember);
      if (result.otpRequired) {
        navigate('/verify-otp', { state: { identifier, remember, from } });
        return;
      }
      toast.success(`Welcome back, ${result.user.contactName.split(' ')[0]}`, result.user.companyName);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    }
  });

  const fillDemo = () => {
    setValue('identifier', MOCK_DEMO_ACCOUNT.username, { shouldValidate: true });
    setValue('password', MOCK_DEMO_ACCOUNT.password, { shouldValidate: true });
  };

  return (
    <AuthLayout>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">HumanCare Worldwide</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">Corporate Portal</h1>
      </div>

      {prefill && !error && (
        <Alert tone="success" className="mt-6">
          Your account is active. Sign in with the password you just created.
        </Alert>
      )}
      {error && (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
        <Field label="Username or Email" htmlFor="identifier" error={errors.identifier?.message}>
          <Input
            id="identifier"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="username or name@company.com"
            leftIcon={<User className="h-4 w-4" />}
            invalid={!!errors.identifier}
            {...register('identifier')}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            leftIcon={<Lock className="h-4 w-4" />}
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <Checkbox label="Remember me" {...register('remember')} />
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Forgot Password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} rightIcon={<ArrowRight className="h-4 w-4" />} className="!mt-6">
          {isSubmitting ? 'Signing in…' : 'Login'}
        </Button>
      </form>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
        <p className="text-sm text-slate-600">
          New Vendor?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Register Now
          </Link>
        </p>
        <p className="mt-1 text-xs text-slate-500">Onboard your company in 3 simple steps.</p>
      </div>

      {USE_MOCK_API && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-3">
          <div className="min-w-0 text-xs text-slate-600">
            <p className="flex items-center gap-1.5 font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" /> Demo mode
            </p>
            <p className="mt-0.5 truncate">Sample account with mock data</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fillDemo}>
            Use demo account
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
