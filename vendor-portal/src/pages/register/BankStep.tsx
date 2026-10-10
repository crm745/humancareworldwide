import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { BankDetailsForm } from '@/components/forms/BankDetailsForm';
import { useDocumentTitle } from '@/hooks/useUtils';
import { StepFooter } from './StepFooter';
import { useRegistration } from './RegistrationContext';

export default function BankStep() {
  useDocumentTitle('Bank Details');
  const navigate = useNavigate();
  const { state, setBank, saveDraft, requestCancel } = useRegistration();

  if (!state.company) return <Navigate to="/register/company" replace />;

  return (
    <Card className="p-5 sm:p-8">
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-900">Bank Details</h2>
        <p className="mt-1 text-sm text-slate-500">Payouts for completed cases are sent to this account after HumanCare finance verifies it.</p>
      </div>
      <BankDetailsForm
        bankType={state.company.country === 'IN' ? 'Domestic' : 'International'}
        defaultValues={state.bank ?? { ...state.bankDraft, accountHolder: state.bankDraft?.accountHolder || state.company.companyName }}
        onSubmit={(values) => {
          setBank(values);
          navigate('/register/documents');
        }}
        footer={({ submitting, getValues }) => (
          <StepFooter
            onBack={() => navigate('/register/company')}
            onCancel={requestCancel}
            onSaveDraft={() => saveDraft('bank', { bank: getValues() })}
            submitting={submitting}
            nextLabel="Next: Documents"
          />
        )}
      />
    </Card>
  );
}
