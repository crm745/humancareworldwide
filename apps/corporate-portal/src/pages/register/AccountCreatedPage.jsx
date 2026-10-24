import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { PageLoader } from '@/components/ui/Loading';
import { useDocumentTitle } from '@/hooks/useUtils';
import { maskEmail } from '@/utils/mask';
import { registrationTimeline, useCurrentRegistration } from './useCurrentRegistration';

export default function AccountCreatedPage() {
  useDocumentTitle('Account Created');
  const navigate = useNavigate();
  const { data: reg, loading } = useCurrentRegistration();

  if (loading || !reg) return <PageLoader label="Loading…" />;
  if (!reg.credentialsCreated) return <Navigate to="/register/credentials" replace />;

  const goToLogin = () => {
    registrationService.clearCurrentId();
    // LoginPage's "username" query param just prefills its identifier field — login
    // itself only ever authenticates by email, so that's what we hand it here.
    navigate(`/login?username=${encodeURIComponent(reg.email)}`, { replace: true });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 text-center sm:p-10 lg:col-span-3">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
          <PartyPopper className="h-8 w-8 text-emerald-600" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Your Corporate Account has been successfully created.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Welcome to the HumanCare Worldwide partner network, {reg.company.companyName}.</p>

        <dl className="mx-auto mt-7 grid max-w-lg gap-3 text-left sm:grid-cols-2">
          {[
            ['Corporate ID', <span className="font-mono">{reg.corporateId}</span>],
            ['Account Status', <StatusBadge status="Active" />],
            ['Registered Email (your login)', maskEmail(reg.email)],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl border border-slate-200 p-3.5">
              <dt className="text-xs font-medium text-slate-500">{k}</dt>
              <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>

        <Button size="lg" className="mt-8" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={goToLogin}>
          Go to Corporate Login
        </Button>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <p className="mb-4 text-[15px] font-semibold text-slate-900">Verification complete</p>
        <StatusTimeline items={registrationTimeline(reg)} />
      </Card>
    </div>
  );
}
