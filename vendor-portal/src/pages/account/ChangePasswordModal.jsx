import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Field, PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useToast } from '@/components/ui/Toast';
import { changePasswordSchema } from '@/utils/schemas';

export function ChangePasswordModal({ open, onClose }) {
  const toast = useToast();
  const { register, handleSubmit, watch, reset, setError, formState } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const submit = handleSubmit(async ({ currentPassword, password }) => {
    try {
      await authService.changePassword(currentPassword, password);
      toast.success('Password changed', 'Use your new password the next time you sign in.');
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not change password';
      setError(msg.toLowerCase().includes('current') ? 'currentPassword' : 'password', { message: msg });
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Change password"
      description="For security, you’ll stay signed in on this device only."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            Update Password
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Current Password" required error={errors.currentPassword?.message} htmlFor="cp-current">
          <PasswordInput id="cp-current" autoComplete="current-password" invalid={!!errors.currentPassword} {...register('currentPassword')} />
        </Field>
        <Field label="New Password" required error={errors.password?.message} htmlFor="cp-new">
          <PasswordInput id="cp-new" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </Field>
        <PasswordStrength password={watch('password')} />
        <Field label="Confirm New Password" required error={errors.confirmPassword?.message} htmlFor="cp-confirm">
          <PasswordInput id="cp-confirm" autoComplete="new-password" invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </Field>
      </form>
    </Modal>
  );
}
