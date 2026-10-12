import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BadgeCheck, MailCheck, MousePointerClick, PencilLine, RotateCw } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { USE_MOCK_API } from '@/services/config';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Misc';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { PageLoader } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useCountdown, useDocumentTitle } from '@/hooks/useUtils';
import { emailOnlySchema } from '@/utils/schemas';
import { maskEmail } from '@/utils/mask';
import { registrationTimeline, useCurrentRegistration } from './useCurrentRegistration';

const RESEND_SECONDS = 45;

export default function VerifyEmailPage() {
  useDocumentTitle('Email Verification');
  const navigate = useNavigate();
  const toast = useToast();
  const { data: reg, loading, setData } = useCurrentRegistration();
  const { left, done, restart } = useCountdown(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  const emailForm = useForm({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } });

  if (loading || !reg) return <PageLoader label="Loading…" />;

  const resend = async () => {
    setResending(true);
    try {
      await registrationService.resendVerificationEmail(reg.id);
      toast.success('Verification email sent', `We’ve sent a new link to ${maskEmail(reg.email)}.`);
      restart();
    } catch (e) {
      toast.error('Could not resend', e instanceof Error ? e.message : undefined);
    } finally {
      setResending(false);
    }
  };

  const changeEmail = emailForm.handleSubmit(async ({ email }) => {
    if (email.toLowerCase() === reg.email) {
      emailForm.setError('email', { message: 'This is already your registered email' });
      return;
    }
    try {
      const updated = await registrationService.changeEmail(reg.id, email);
      setData(updated);
      setChangeOpen(false);
      emailForm.reset();
      restart();
      toast.success('Email address updated', `A verification link was sent to ${maskEmail(updated.email)}.`);
    } catch (e) {
      emailForm.setError('email', { message: e instanceof Error ? e.message : 'Could not update email' });
    }
  });

  const simulate = async () => {
    setVerifying(true);
    try {
      setData(await registrationService.simulateEmailVerification(reg.id));
      toast.success('Email verified', 'Your registration has been verified.');
    } catch (e) {
      toast.error('Verification failed', e instanceof Error ? e.message : undefined);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 sm:p-8 lg:col-span-3">
        {reg.emailVerified ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
              <BadgeCheck className="h-9 w-9 text-emerald-600" />
            </span>
            <h2 className="mt-5 flex items-center gap-2 text-xl font-semibold text-slate-900">Email Verified ✓</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              <span className="font-medium text-slate-700">{maskEmail(reg.email)}</span> has been confirmed and your documents and bank details are verified.
              Create your login to activate the account.
            </p>
            <Button className="mt-7" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/register/credentials')}>
              Create Username &amp; Password
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-8 ring-brand-50/60">
                <MailCheck className="h-8 w-8 text-brand-600" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-slate-900">Check your inbox</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">Verification email has been sent to your registered email address.</p>
              <p className="mt-3 rounded-lg bg-slate-100 px-4 py-2 font-mono text-[15px] font-semibold text-slate-800">{maskEmail(reg.email)}</p>
              <p className="mt-4 max-w-md text-[13px] text-slate-500">
                Click the link in the email to verify. The link is valid for 24 hours. Don’t forget to check your spam folder.
              </p>
            </div>

            <div className="mt-7 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" leftIcon={<RotateCw className="h-4 w-4" />} onClick={resend} disabled={!done} loading={resending}>
                Resend Verification Email
              </Button>
              <Button variant="ghost" leftIcon={<PencilLine className="h-4 w-4" />} onClick={() => setChangeOpen(true)}>
                Change Email Address
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500" aria-live="polite">
              {done ? (
                'You can request a new email now.'
              ) : (
                <>
                  Resend available in <span className="font-semibold tabular-nums text-slate-700">{left}</span> seconds.
                </>
              )}
            </p>

            {USE_MOCK_API && (
              <Alert
                tone="info"
                className="mt-7"
                title="Demo mode — no real email is sent"
                action={
                  <Button size="sm" onClick={simulate} loading={verifying} leftIcon={<MousePointerClick className="h-3.5 w-3.5" />}>
                    Open link
                  </Button>
                }
              >
                Simulate clicking the verification link. This also simulates HumanCare approving your documents and bank details, which takes up to 48 hours in
                production.
              </Alert>
            )}
          </>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Verification Status" description={`Vendor ID ${reg.vendorId}`} />
        <div className="p-5">
          <StatusTimeline items={registrationTimeline(reg)} />
        </div>
      </Card>

      <Modal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Change email address"
        description="We’ll send a new verification link to this address."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={changeEmail} loading={emailForm.formState.isSubmitting}>
              Update &amp; Send Link
            </Button>
          </>
        }
      >
        <form onSubmit={changeEmail} noValidate>
          <Field label="New email address" required error={emailForm.formState.errors.email?.message} htmlFor="newEmail">
            <Input id="newEmail" type="email" placeholder="name@company.com" invalid={!!emailForm.formState.errors.email} {...emailForm.register('email')} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
