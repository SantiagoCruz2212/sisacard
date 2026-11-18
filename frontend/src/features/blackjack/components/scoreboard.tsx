import { useTranslation } from 'react-i18next';
import { PlayingCard } from '@/features/blackjack/components/playing-card';
import type { BlackjackView } from '@/shared/models/realtime';

/** Una fila por jugador con su mano (pública), su valor y el total del ciclo hacia el corte de 42. */
export function Scoreboard({ view, meId }: { view: BlackjackView; meId: string }) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex flex-col gap-2">
      {view.players.map((p) => {
        const isTurn = p.id === view.turnId;
        const busted = p.status === 'busted';
        return (
          <div
            key={p.id}
            className={`rounded-lg border px-3 py-2 ${isTurn ? 'border-primary bg-primary/15' : 'border-line bg-bg'} ${
              p.out ? 'opacity-55' : ''
            }`}
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <b className={p.id === meId ? 'text-good' : ''}>{p.username}</b>
              <span className="flex items-center gap-2 text-xs text-muted">
                {p.roundValues.map((v, i) => (
                  <span key={i}>
                    R{i + 1}: <b className="text-fg">{v}</b>
                  </span>
                ))}
                {p.roundValues.length > 0 && <span>{t('blackjack.total', { total: p.total, cut: view.cutTarget })}</span>}
                <span className={busted ? 'text-bad' : isTurn ? 'text-primary' : ''}>{t(`blackjack.status.${p.status}`)}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {p.cards.map((c) => (
                <PlayingCard key={c.id} card={c} />
              ))}
              {p.cards.length > 0 && (
                <span className={`ml-2 text-2xl font-bold ${busted ? 'text-bad' : ''}`}>
                  {p.value}
                  {p.soft && !busted && <span className="ml-1 text-xs font-normal text-muted">{t('blackjack.soft')}</span>}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
