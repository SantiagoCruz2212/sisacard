import { useTranslation } from 'react-i18next';
import { cardLabel } from '@/features/uno/models/card-label';
import type { UnoView } from '@/shared/models/realtime';

export function GameLog({ view, nameOf }: { view: UnoView; nameOf: (id: string | null) => string }) {
  const { t } = useTranslation();
  const lines = [...view.log].reverse().map((e) => {
    const name = nameOf(e.userId);
    switch (e.kind) {
      case 'play':
        return e.card && e.color
          ? t('uno.log.playWild', { name, card: cardLabel(e.card, t), color: t(`uno.colors.${e.color}`) })
          : t('uno.log.play', { name, card: e.card ? cardLabel(e.card, t) : '' });
      case 'draw':
        return t('uno.log.draw', { name, count: e.count ?? 1 });
      case 'unoPenalty':
        return t('uno.log.unoPenalty', { name, count: e.count ?? 2 });
      case 'finished':
        return t('uno.log.finished', { name, place: e.place ?? 0 });
      case 'timeout':
        return t('uno.log.timeout', { name });
    }
  });
  if (lines.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-2 text-xs text-muted">
      {lines.map((line, i) => (
        <div key={i} className={i === 0 ? 'text-fg' : ''}>
          {line}
        </div>
      ))}
    </div>
  );
}
