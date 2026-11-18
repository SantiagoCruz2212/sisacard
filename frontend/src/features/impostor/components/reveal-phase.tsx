import { useTranslation } from 'react-i18next';
import type { PhaseProps } from '@/features/impostor/models/phase-props';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import { Card } from '@/shared/ui/card';

export function RevealPhase({ view, seconds }: PhaseProps) {
  const { t } = useTranslation();
  const hidden = usePrivacyStore((s) => s.hidden);
  const isImpostor = view.role === 'impostor';
  if (view.role === 'spectator') {
    return (
      <Card className="text-center">
        <p className="mb-2">{t('impostor.spectatorBanner')}</p>
        <p className="text-sm text-muted">{t('impostor.roundStartsIn', { seconds })}</p>
      </Card>
    );
  }
  if (hidden) {
    return (
      <Card className="text-center">
        <h2 className="mb-2 text-xl font-semibold">{t('impostor.yourRole')}</h2>
        <div className="my-3 text-3xl font-bold">🔒</div>
        <p className="mb-2">{t('privacy.hiddenNote')}</p>
        <p className="text-sm text-muted">{t('impostor.roundStartsIn', { seconds })}</p>
      </Card>
    );
  }
  return (
    <Card className="text-center">
      <h2 className="mb-2 text-xl font-semibold">{t('impostor.yourRole')}</h2>
      <div className={`my-3 text-3xl font-bold ${isImpostor ? 'text-bad' : ''}`}>
        {isImpostor ? t('impostor.impostorTitle') : view.word}
      </div>
      <p className="mb-2">
        {isImpostor
          ? t('impostor.impostorHint', { category: view.category })
          : t('impostor.crewHint', { category: view.category })}
      </p>
      <p className="text-sm text-muted">{t('impostor.roundStartsIn', { seconds })}</p>
    </Card>
  );
}
