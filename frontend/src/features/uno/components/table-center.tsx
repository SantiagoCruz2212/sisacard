import { useTranslation } from 'react-i18next';
import { CardBack, UnoCard } from '@/features/uno/components/uno-card';
import { cardLabel } from '@/features/uno/models/card-label';
import { DOT_COLOR_CLASS } from '@/features/uno/models/card-style';
import type { UnoView } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';

interface TableCenterProps {
  view: UnoView;
  meId: string;
  seconds: number;
  onDraw: () => void;
  onPass: () => void;
}

export function TableCenter({ view, meId, seconds, onDraw, onPass }: TableCenterProps) {
  const { t } = useTranslation();
  const myPenalty = view.penalty?.victimId === meId ? view.penalty.amount : 0;
  const showNumber = /^\d$/.test(view.currentValue) && view.top?.value !== view.currentValue;
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-center gap-5 rounded-xl p-4 ${
        view.side === 'dark' ? 'bg-black/60 ring-1 ring-uno-purple/50' : 'bg-bg'
      }`}
    >
      <div className="text-center">
        {view.deckBack ? (
          <div className="flex flex-col items-center gap-1">
            <UnoCard card={view.deckBack} label={`${t('uno.deckShows')}: ${cardLabel(view.deckBack, t)}`} onClick={onDraw} disabled={!view.canDraw} playable={view.canDraw} />
          </div>
        ) : (
          <CardBack label={t('uno.draw')} onClick={onDraw} disabled={!view.canDraw} />
        )}
        <p className="mt-1 text-xs text-muted">{t('uno.deck', { count: view.drawCount })}</p>
        {myPenalty > 0 && view.canDraw && (
          <Button variant="primary" className="mt-1" onClick={onDraw}>
            {t('uno.drawN', { count: myPenalty })}
          </Button>
        )}
      </div>
      {view.top && <UnoCard card={view.top} label={cardLabel(view.top, t)} />}
      <div className="flex flex-col items-center gap-2 text-sm">
        {view.settings.flip && <span className="font-semibold">{t(`uno.side.${view.side}`)}</span>}
        <span className="flex items-center gap-2">
          <span className={`inline-block h-4 w-4 rounded-full ${DOT_COLOR_CLASS[view.currentColor]}`} />
          {t('uno.colorNow', { color: t(`uno.colors.${view.currentColor}`) })}
        </span>
        {showNumber && <span className="font-semibold">{t('uno.numberNow', { number: view.currentValue })}</span>}
        <span className="text-muted">{view.direction === 1 ? '↻' : '↺'}</span>
        <span className="text-primary">{seconds}s</span>
        {view.penalty && view.penalty.victimId !== meId && (
          <span className="text-bad">+{view.penalty.amount}</span>
        )}
        {view.canPass && <Button onClick={onPass}>{t('uno.pass')}</Button>}
      </div>
    </div>
  );
}
