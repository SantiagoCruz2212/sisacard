import { useTranslation } from 'react-i18next';
import type { PhaseProps } from '@/features/impostor/models/phase-props';
import { Card } from '@/shared/ui/card';

export function ResultPhase({ view, seconds, nameOf }: PhaseProps) {
  const { t } = useTranslation();
  const result = view.result;
  if (!result) return null;
  return (
    <Card className="text-center">
      <h2 className="mb-2 text-xl font-semibold">{t('impostor.resultTitle')}</h2>
      {result.eliminated === null ? (
        <div className="my-3 text-3xl font-bold">{t('impostor.tie')}</div>
      ) : (
        <div className={`my-3 text-3xl font-bold ${result.wasImpostor ? 'text-good' : 'text-bad'}`}>
          {t(result.wasImpostor ? 'impostor.wasImpostor' : 'impostor.wasInnocent', { name: nameOf(result.eliminated) })}
        </div>
      )}
      <div className="mt-3.5 text-left">
        {result.votes.map((v, i) => (
          <div key={i} className="border-t border-line py-1 text-sm">
            <b>{nameOf(v.from)}</b> → {v.to === null ? t('impostor.skipped') : nameOf(v.to)}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{t('impostor.nextIn', { seconds })}</p>
    </Card>
  );
}
