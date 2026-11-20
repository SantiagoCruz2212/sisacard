import { useTranslation } from 'react-i18next';
import { CardBack, UnoCard } from '@/features/uno/components/uno-card';
import { cardLabel } from '@/features/uno/models/card-label';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import type { UnoCard as Card, UnoView } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';

interface HandProps {
  view: UnoView;
  sayUno: boolean;
  onToggleUno: () => void;
  onSelect: (card: Card) => void;
  /** Mientras eliges qué descartar (/2, -1): las cartas marcadas. */
  discardSel?: number[] | null;
}

export function Hand({ view, sayUno, onToggleUno, onSelect, discardSel = null }: HandProps) {
  const { t } = useTranslation();
  const hidden = usePrivacyStore((s) => s.hidden);
  const discarding = discardSel !== null;
  // Solo tiene sentido recordar el UNO cuando tu jugada puede dejarte con una carta.
  const aboutToUno = view.myHand.length >= 2 && view.myHand.length <= 3 && (view.playable.length > 0 || discarding);

  return (
    <div>
      <div className="flex min-h-[110px] flex-wrap items-end gap-1.5 pt-3">
        {hidden && view.myHand.map((card) => <CardBack key={card.id} label={t('privacy.hiddenCard')} />)}
        {!hidden &&
          view.myHand.map((card) => {
            const playable = discarding || view.playable.includes(card.id);
            return (
              <UnoCard
                key={card.id}
                card={card}
                label={cardLabel(card, t)}
                dark={view.side === 'dark'}
                playable={playable}
                selected={discardSel?.includes(card.id)}
                disabled={!playable}
                onClick={() => onSelect(card)}
              />
            );
          })}
      </div>
      {hidden && <p className="mt-2 text-xs text-muted">{t('privacy.hiddenNote')}</p>}
      {aboutToUno && (
        <div className="mt-3 flex items-center gap-3">
          <Button variant={sayUno ? 'primary' : 'secondary'} onClick={onToggleUno}>
            {t('uno.sayUno')}
          </Button>
          <span className="text-xs text-muted">{view.settings.catchUno ? t('uno.unoHintCatch') : t('uno.unoHint')}</span>
        </div>
      )}
    </div>
  );
}
