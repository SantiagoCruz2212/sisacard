import { useTranslation } from 'react-i18next';
import type { BlackjackLogEntry } from '@/shared/models/realtime';

interface EventLogProps {
  log: BlackjackLogEntry[];
  nameOf: (id: string | null | undefined) => string;
}

export function EventLog({ log, nameOf }: EventLogProps) {
  const { t } = useTranslation();
  const lines = [...log].reverse().map((e) => {
    switch (e.kind) {
      case 'bust':
        return t('blackjack.log.bust', { name: nameOf(e.userId), value: e.value });
      case 'round':
        return t('blackjack.log.round');
      case 'cut':
        return t('blackjack.log.cut', { names: (e.ids ?? []).map(nameOf).join(', '), value: e.value });
      case 'tie':
        return t('blackjack.log.tie', { value: e.value });
      case 'reset':
        return t('blackjack.log.reset');
      case 'left':
        return t('blackjack.log.left', { name: nameOf(e.userId) });
    }
  });
  if (lines.length === 0) return null;
  return (
    <div className="mt-3 border-t border-line pt-2 text-xs text-muted">
      {lines.map((line, i) => (
        <div key={i} className={i === 0 ? 'text-fg' : ''}>
          {line}
        </div>
      ))}
    </div>
  );
}
