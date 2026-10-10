import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StepFooterProps {
  onBack?: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  nextLabel?: string;
  submitting?: boolean;
  nextDisabled?: boolean;
}

/** Cancel · Save Draft · Back · Next — shared by the three form steps. Next is the form's submit button. */
export function StepFooter({ onBack, onSaveDraft, onCancel, nextLabel = 'Next', submitting, nextDisabled }: StepFooterProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="ghost" onClick={onCancel} disabled={submitting} className="text-slate-500">
        Cancel
      </Button>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" onClick={onSaveDraft} disabled={submitting} leftIcon={<Save className="h-4 w-4" />}>
          Save Draft
        </Button>
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={submitting} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        )}
        <Button type="submit" loading={submitting} disabled={nextDisabled} rightIcon={<ArrowRight className="h-4 w-4" />} className="sm:min-w-[140px]">
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
