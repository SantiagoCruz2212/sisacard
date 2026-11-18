import { useTranslation } from 'react-i18next';
import { CardBack, UnoCard } from '@/features/uno/components/uno-card';
import { cardLabel } from '@/features/uno/models/card-label';
import { DOT_COLOR_CLASS } from '@/features/uno/models/card-style';
import type { UnoView } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';

interface TableCenterProps {
  view: UnoView;
  seconds: number;
  onDraw: () => void;
  onPass: () => void;
}

export function TableCenter({ view, seconds, onDraw, onPass }: TableCenterProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-5 rounded-xl bg-bg p-4">
      <div className="text-center">
        <CardBack label={t('uno.draw')} onClick={onDraw} disabled={!view.canDraw} />
        <p className="mt-1 text-xs text-muted">{t('uno.deck', { count: view.drawCount })}</p>
      </div>
      {view.top && <UnoCard card={view.top} label={cardLabel(view.top, t)} />}
      <div className="flex flex-col items-center gap-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={`inline-block h-4 w-4 rounded-full ${DOT_COLOR_CLASS[view.currentColor]}`} />
          {t('uno.colorNow', { color: t(`uno.colors.${view.currentColor}`) })}
        </span>
        <span className="text-muted">{view.direction === 1 ? '↻' : '↺'}</span>
        <span className="text-primary">{seconds}s</span>
        {view.canPass && <Button onClick={onPass}>{t('uno.pass')}</Button>}
      </div>
    </div>
  );
}
