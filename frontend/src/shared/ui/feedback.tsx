import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks/use-toast';

export function Toast() {
  const message = useToast((s) => s.message);
  const hide = useToast((s) => s.hide);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 3500);
    return () => clearTimeout(timer);
  }, [message, hide]);
  if (!message) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-black px-4 py-2.5"
    >
      {message}
    </div>
  );
}

export function ConnectionBanner({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  if (connected) return null;
  return <div className="bg-bad py-1.5 text-center text-sm">{t('common.reconnecting')}</div>;
}
