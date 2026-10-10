import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { CompanyDetailsForm } from '@/components/forms/CompanyDetailsForm';
import { useDocumentTitle } from '@/hooks/useUtils';
import type { CompanyDetails } from '@/types';
import { StepFooter } from './StepFooter';
import { useRegistration } from './RegistrationContext';

export default function CompanyStep() {
  useDocumentTitle('Company Details');
  const navigate = useNavigate();
  const { state, setCompany, saveDraft, requestCancel } = useRegistration();

  return (
    <Card className="p-5 sm:p-8">
      <div className="mb-7">
        <h2 className="text-lg font-semibold text-slate-900">Company Details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Fields marked <span className="text-red-500">*</span> are required.
        </p>
      </div>
      {/* key: remount with restored values when a draft is resumed */}
      <CompanyDetailsForm
        key={state.company?.companyName ?? state.companyDraft?.companyName ?? 'new'}
        defaultValues={state.company ?? state.companyDraft}
        onSubmit={(values) => {
          setCompany(values);
          navigate('/register/bank');
        }}
        footer={({ submitting, getValues }) => (
          <StepFooter
            onCancel={requestCancel}
            onSaveDraft={() => saveDraft('company', { company: getValues() as CompanyDetails })}
            submitting={submitting}
            nextLabel="Next: Bank Details"
          />
        )}
      />
    </Card>
  );
}
