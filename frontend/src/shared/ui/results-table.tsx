import { useTranslation } from 'react-i18next';

export interface ResultRow {
  userId: string;
  name: string;
  place: number;
  points: number;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Posiciones finales y puntos ganados al terminar una partida. Lo usan todos los juegos. */
export function ResultsTable({ rows, meId }: { rows: ResultRow[]; meId: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3.5 text-left">
      <h3 className="mb-1 text-sm font-semibold text-muted">{t('results.title')}</h3>
      {rows.map((r) => (
        <div
          key={r.userId}
          className={`flex items-center justify-between border-t border-line py-1.5 text-sm ${r.userId === meId ? 'font-semibold text-good' : ''}`}
        >
          <span>
            {MEDALS[r.place] ?? `${r.place}.º`} {r.name}
          </span>
          <span className="text-primary">+{r.points}</span>
        </div>
      ))}
    </div>
  );
}
