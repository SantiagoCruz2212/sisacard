import { useTranslation } from 'react-i18next';
import { cardLabel } from '@/features/uno/models/card-label';
import type { UnoLogEntry, UnoView } from '@/shared/models/realtime';

export function GameLog({ view, nameOf }: { view: UnoView; nameOf: (id: string | null | undefined) => string }) {
  const { t } = useTranslation();
  const line = (e: UnoLogEntry): string => {
    const name = nameOf(e.userId);
    const target = nameOf(e.targetId);
    switch (e.kind) {
      case 'play': {
        let text = t('uno.log.play', { name, card: e.card ? cardLabel(e.card, t) : '' });
        const what = [e.color && t(`uno.colors.${e.color}`), e.number].filter(Boolean).join(' ');
        if (what) text += t('uno.log.chose', { what });
        if (e.targetId) text += t('uno.log.against', { target });
        return text;
      }
      case 'draw':
        return t('uno.log.draw', { name, count: e.count ?? 1 });
      case 'unoPenalty':
        return t('uno.log.unoPenalty', { name, count: e.count ?? 2 });
      case 'finished':
        return t('uno.log.finished', { name, place: e.place ?? 0 });
      case 'timeout':
        return t('uno.log.timeout', { name });
      case 'challenge':
        return e.success ? t('uno.log.challengeWon', { name, target }) : t('uno.log.challengeLost', { name, target });
      case 'caught':
        return t('uno.log.caught', { name, target, count: e.count ?? 2 });
      case 'saidUno':
        return t('uno.log.saidUno', { name });
      case 'swap':
        return t('uno.log.swap', { name, target });
      case 'rotate':
        return t('uno.log.rotate', { name });
      case 'flip':
        return e.color ? t('uno.log.flipColor', { name, color: t(`uno.colors.${e.color}`) }) : t('uno.log.flip', { name });
      case 'dice':
        return t('uno.log.dice', { name, count: e.count ?? 6, roll: e.roll ?? 0 });
      case 'discard':
        return t('uno.log.discard', { name, count: e.count ?? 1 });
      case 'eye':
        return t('uno.log.eye', { name, target });
      case 'jumpIn':
        return t('uno.log.jumpIn', { name });
    }
  };
  const lines = [...view.log].reverse().map(line);
  if (lines.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-2 text-xs text-muted">
      {lines.map((text, i) => (
        <div key={i} className={i === 0 ? 'text-fg' : ''}>
          {text}
        </div>
      ))}
    </div>
  );
}
