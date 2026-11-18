import type { ParseKeys } from 'i18next';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Credentials } from '@/features/auth/models/auth-schemas';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

interface CredentialsFormProps {
  form: UseFormReturn<Credentials>;
  onSubmit: () => void;
  subtitle: string;
  submitLabel: string;
  switchLabel: string;
  switchTo: string;
  error?: string;
  busy: boolean;
}

export function CredentialsForm({
  form,
  onSubmit,
  subtitle,
  submitLabel,
  switchLabel,
  switchTo,
  error,
  busy,
}: CredentialsFormProps) {
  const { t } = useTranslation();
  const { register, formState } = form;
  const msg = (key?: string) => (key ? t(key as ParseKeys) : undefined);

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-[340px]">
        <form onSubmit={onSubmit} noValidate>
          <h1 className="mb-2 text-[22px] font-semibold">🃏 {t('common.appName')}</h1>
          <p className="mb-4 text-sm text-muted">{subtitle}</p>
          <Input
            label={t('auth.username')}
            maxLength={16}
            autoFocus
            error={formState.dirtyFields.username ? msg(formState.errors.username?.message) : undefined}
            {...register('username')}
          />
          <Input
            label={t('auth.pin')}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            error={formState.dirtyFields.pin ? msg(formState.errors.pin?.message) : undefined}
            {...register('pin', {
              onChange: (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
              },
            })}
          />
          {error && <p className="mb-2 text-bad">{error}</p>}
          <Button type="submit" variant="primary" className="mt-2 w-full" disabled={busy || !formState.isValid}>
            {submitLabel}
          </Button>
          <Link to={switchTo} className="mt-3 block text-center text-sm text-muted">
            {switchLabel}
          </Link>
        </form>
      </Card>
    </div>
  );
}
