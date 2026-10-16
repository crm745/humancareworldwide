import { Suspense, useCallback, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, RotateCcw } from 'lucide-react';

import { registrationService } from '@/services/registrationService';
import { Logo, Alert } from '@/components/ui/Misc';
import { Stepper } from '@/components/ui/Stepper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';

import { formatDateTime } from '@/utils/format';
import { companySchema } from '@/utils/schemas';
import { EMPTY_COMPANY } from '@/components/forms/CompanyDetailsForm';
import { SUPPORT_EMAIL } from '@/data/constants';
import { REGISTRATION_STEPS, RegistrationContext, STEP_INDEX } from '@/pages/register/RegistrationContext';

/** Fill the form from a saved draft. A complete company section counts as finished, so the user can carry on. */
function stateFromDraft(draft) {
  if (!draft) return { documents: {} };
  const parsed = draft.company ? companySchema.safeParse({ ...EMPTY_COMPANY, ...draft.company }) : null;
  return {
    documents: {},
    company: parsed?.success ? parsed.data : undefined,
    companyDraft: draft.company,
    bankDraft: draft.bank,
  };
}

export function RegistrationLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState(() => registrationService.loadDraft());
  const [state, setState] = useState(() => stateFromDraft(draft));
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Opening /register continues from the step the draft was saved on (bank needs the account number re-entered).
  const [resumeAt] = useState(() => (draft && draft.step !== 'company' && state.company ? 'bank' : 'company'));

  const segment = location.pathname.split('/')[2] ?? 'company';
  const stepIndex = STEP_INDEX[segment] ?? 0;
  const formStep = stepIndex <= 2;
  const showDraftBanner = !!draft && formStep;

  const setCompany = useCallback((company) => setState((s) => ({ ...s, company })), []);
  const setBank = useCallback((bank) => setState((s) => ({ ...s, bank })), []);
  const setDocument = useCallback((key, f) => setState((s) => ({ ...s, documents: { ...s.documents, [key]: f } })), []);

  const saveDraft = useCallback(
    (step, patch) => {
      const saved = registrationService.saveDraft({
        step,
        company: patch.company ?? state.company ?? state.companyDraft,
        bank: patch.bank ?? state.bank ?? state.bankDraft,
      });
      setDraft(saved);
      toast.success('Draft saved', 'Bank account numbers and uploaded files are not stored in drafts for your security.');
    },
    [state.company, state.companyDraft, state.bank, state.bankDraft, toast],
  );

  const resetAll = useCallback(() => {
    registrationService.clearDraft();
    registrationService.clearCurrentId();
    setDraft(null);
    setState({ documents: {} });
  }, []);

  const startOver = () => {
    resetAll();
    toast.info('Draft discarded', 'You can start a fresh registration.');
    navigate('/register/company', { replace: true });
  };

  const value = useMemo(
    () => ({ state, resumeAt, setCompany, setBank, setDocument, saveDraft, requestCancel: () => setConfirmCancel(true), resetAll }),
    [state, resumeAt, setCompany, setBank, setDocument, saveDraft, resetAll],
  );

  return (
    <RegistrationContext.Provider value={value}>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link to="/login" aria-label="HumanCare Worldwide">
              <Logo className="h-9 sm:h-10" />
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hidden items-center gap-1.5 text-slate-500 hover:text-slate-800 sm:inline-flex">
                <HelpCircle className="h-4 w-4" /> Need help?
              </a>
              <span className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />
              <span className="hidden text-slate-500 md:inline">Already registered?</span>
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">New Corporate Registration</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Join the HumanCare partner network</h1>
            <p className="mt-1.5 text-sm text-slate-500">Complete the steps below. Verification usually takes up to 48 hours.</p>
          </div>

          {/* The form has 3 stages; verification and account pages follow after submitting. */}
          {formStep && (
            <Card className="mb-6 px-5 py-5 sm:px-8 sm:py-6">
              <Stepper steps={REGISTRATION_STEPS} current={stepIndex} />
            </Card>
          )}

          {showDraftBanner && draft && (
            <Alert
              tone="info"
              className="mb-6"
              title="Saved draft restored"
              action={
                <Button size="sm" variant="ghost" onClick={startOver} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
                  Start over
                </Button>
              }
            >
              Your details saved on {formatDateTime(draft.savedAt)}
              {draft.company?.companyName ? ` for ${draft.company.companyName}` : ''} have been filled in. For security, re-enter the bank account number and
              upload the documents again.
            </Alert>
          )}

          <Suspense fallback={<PageLoader />}>
            <div key={location.pathname} className="animate-slide-up">
              <Outlet />
            </div>
          </Suspense>

          {formStep && (
            <p className="mt-6 text-center text-xs text-slate-400">
              By registering you agree to HumanCare Worldwide’s partner terms and privacy policy. Your data is encrypted in transit and at rest.
            </p>
          )}
        </div>

        <ConfirmDialog
          open={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false);
            resetAll();
            toast.info('Registration cancelled');
            navigate('/login');
          }}
          title="Cancel registration?"
          message="Everything you have entered — including any saved draft — will be discarded."
          confirmLabel="Yes, cancel"
        />
      </div>
    </RegistrationContext.Provider>
  );
}
