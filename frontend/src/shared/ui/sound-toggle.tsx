import { useTranslation } from 'react-i18next';
import { useSoundStore } from '@/shared/lib/sound-store';
import { Button } from '@/shared/ui/button';

export function SoundToggle() {
  const { t } = useTranslation();
  const muted = useSoundStore((s) => s.muted);
  const toggle = useSoundStore((s) => s.toggle);
  return (
    <Button variant="secondary" onClick={toggle} title={muted ? t('sound.off') : t('sound.on')} aria-label={muted ? t('sound.off') : t('sound.on')}>
      {muted ? '🔕' : '🔔'}
    </Button>
  );
}
