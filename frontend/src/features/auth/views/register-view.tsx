import { useTranslation } from 'react-i18next';
import { CredentialsForm } from '@/features/auth/components/credentials-form';
import { useRegister } from '@/features/auth/hooks/use-register';

export function RegisterView() {
  const { t } = useTranslation();
  const { form, submit, error, isPending } = useRegister();
  return (
    <CredentialsForm
      form={form}
      onSubmit={submit}
      subtitle={t('auth.registerSubtitle')}
      submitLabel={t('auth.register')}
      switchLabel={t('auth.toLogin')}
      switchTo="/login"
      error={error}
      busy={isPending}
    />
  );
}
