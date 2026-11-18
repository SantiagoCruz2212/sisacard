import { useTranslation } from 'react-i18next';
import { CardBack, UnoCard } from '@/features/uno/components/uno-card';
import { cardLabel } from '@/features/uno/models/card-label';
import { COLORS, DOT_COLOR_CLASS } from '@/features/uno/models/card-style';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import type { UnoCard as Card, UnoColor, UnoView } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';

interface HandProps {
  view: UnoView;
  isMyTurn: boolean;
  sayUno: boolean;
  pendingWild: Card | null;
  onToggleUno: () => void;
  onSelect: (card: Card) => void;
  onChooseColor: (color: UnoColor) => void;
  onCancelWild: () => void;
}

export function Hand({ view, isMyTurn, sayUno, pendingWild, onToggleUno, onSelect, onChooseColor, onCancelWild }: HandProps) {
  const { t } = useTranslation();
  const hidden = usePrivacyStore((s) => s.hidden);
  // Solo tiene sentido recordar el UNO cuando jugar una carta te deja con una.
  const aboutToUno = isMyTurn && view.myHand.length === 2;

  return (
    <div>
      {pendingWild && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-line p-3">
          <span className="text-sm">{t('uno.chooseColor')}</span>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t(`uno.colors.${c}`)}
              onClick={() => onChooseColor(c)}
              className={`h-9 w-9 cursor-pointer rounded-full border-2 border-white/70 ${DOT_COLOR_CLASS[c]}`}
            />
          ))}
          <Button variant="ghost" onClick={onCancelWild}>
            ✕
          </Button>
        </div>
      )}
      <div className="flex min-h-[110px] flex-wrap items-end gap-1.5 pt-3">
        {hidden && view.myHand.map((card) => <CardBack key={card.id} label={t('privacy.hiddenCard')} />)}
        {!hidden && view.myHand.map((card) => {
          const playable = view.playable.includes(card.id);
          return (
            <UnoCard
              key={card.id}
              card={card}
              label={cardLabel(card, t)}
              playable={playable}
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
          <span className="text-xs text-muted">{t('uno.unoHint')}</span>
        </div>
      )}
    </div>
  );
}
