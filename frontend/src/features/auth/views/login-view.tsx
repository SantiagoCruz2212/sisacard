import { useTranslation } from 'react-i18next';
import { CredentialsForm } from '@/features/auth/components/credentials-form';
import { useLogin } from '@/features/auth/hooks/use-login';

export function LoginView() {
  const { t } = useTranslation();
  const { form, submit, error, isPending } = useLogin();
  return (
    <CredentialsForm
      form={form}
      onSubmit={submit}
      subtitle={t('auth.loginSubtitle')}
      submitLabel={t('auth.login')}
      switchLabel={t('auth.toRegister')}
      switchTo="/register"
      error={error}
      busy={isPending}
    />
  );
}
