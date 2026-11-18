import { useTranslation } from 'react-i18next';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import type { ImpostorView } from '@/shared/models/realtime';

export function RoleBanner({ view }: { view: ImpostorView }) {
  const { t } = useTranslation();
  const hidden = usePrivacyStore((s) => s.hidden);
  const isImpostor = view.role === 'impostor';
  if (view.role === 'spectator') return <div className="mb-3.5 rounded-lg bg-line px-3 py-2.5">{t('impostor.spectatorBanner')}</div>;
  if (hidden) return <div className="mb-3.5 rounded-lg bg-line px-3 py-2.5">{t('privacy.hiddenNote')}</div>;
  return (
    <div className={`mb-3.5 rounded-lg px-3 py-2.5 ${isImpostor ? 'bg-bad-soft' : 'bg-line'}`}>
      {isImpostor
        ? t('impostor.roleBarImpostor', { category: view.category })
        : t('impostor.roleBarCrew', { word: view.word, category: view.category })}
    </div>
  );
}
