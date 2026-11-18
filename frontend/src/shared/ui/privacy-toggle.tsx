import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import { Button } from '@/shared/ui/button';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

/** Botón (y tecla H) para ocultar o mostrar tu información secreta sin que nadie más lo note. */
export function PrivacyToggle() {
  const { t } = useTranslation();
  const hidden = usePrivacyStore((s) => s.hidden);
  const toggle = usePrivacyStore((s) => s.toggle);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'h' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const label = hidden ? t('privacy.show') : t('privacy.hide');
  return (
    <Button variant={hidden ? 'primary' : 'secondary'} onClick={toggle} title={label} aria-label={label} aria-pressed={hidden}>
      {hidden ? '🙈' : '👁'}
    </Button>
  );
}
