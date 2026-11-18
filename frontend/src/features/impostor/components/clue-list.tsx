import { useTranslation } from 'react-i18next';
import type { ImpostorView } from '@/shared/models/realtime';

interface ClueListProps {
  clues: ImpostorView['clues'];
  nameOf: (userId: string | null) => string;
}

export function ClueList({ clues, nameOf }: ClueListProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-3.5 text-left">
      {clues.length === 0 && <p className="text-sm text-muted">{t('impostor.noClues')}</p>}
      {clues.map((c, i) => (
        <div key={i} className="border-t border-line py-1 text-sm">
          <span className="text-muted">R{c.round}</span> <b>{nameOf(c.userId)}</b>: {c.text}
        </div>
      ))}
    </div>
  );
}
