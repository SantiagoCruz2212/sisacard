import { useTranslation } from 'react-i18next';
import { UnoCard } from '@/features/uno/components/uno-card';
import { cardLabel } from '@/features/uno/models/card-label';
import { cardHelp } from '@/features/uno/models/card-help';
import type { UnoView } from '@/shared/models/realtime';

/** Carta Ojo: la mano espiada se ve unos segundos, solo en tu pantalla. */
export function RevealPanel({ view, seconds, nameOf }: { view: UnoView; seconds: number; nameOf: (id: string) => string }) {
  const { t } = useTranslation();
  if (!view.reveal || seconds <= 0) return null;
  return (
    <div className="mb-3 rounded-lg border border-primary/60 bg-primary/10 p-3">
      <p className="mb-2 text-sm font-semibold">👁 {t('uno.revealTitle', { name: nameOf(view.reveal.targetId), seconds })}</p>
      <div className="flex flex-wrap gap-1">
        {view.reveal.cards.map((face, i) => (
          <UnoCard key={i} card={face} dark={view.side === 'dark'} help={cardHelp(face, view.settings, t)} label={cardLabel(face, t)} size="sm" />
        ))}
      </div>
    </div>
  );
}
