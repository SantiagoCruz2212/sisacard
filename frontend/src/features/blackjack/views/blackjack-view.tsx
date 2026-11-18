import { useTranslation } from 'react-i18next';
import { EventLog } from '@/features/blackjack/components/event-log';
import { Scoreboard } from '@/features/blackjack/components/scoreboard';
import { useBlackjack } from '@/features/blackjack/hooks/use-blackjack';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ResultsTable } from '@/shared/ui/results-table';

/** Pantalla de Blackjack Royale: reglas del ciclo, manos de todos, acciones y registro de eventos. */
export function BlackjackView() {
  const { t } = useTranslation();
  const bj = useBlackjack();
  const { view, meId } = bj;
  if (!view) return null;

  const winner = view.results?.find((r) => r.place === 1);
  const mine = view.results?.find((r) => r.userId === meId);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between text-sm">
        <b>{t('blackjack.rules', { round: view.round, cycle: view.cycle })}</b>
        {view.phase === 'playing' && <span className="text-primary">{bj.seconds}s</span>}
      </div>
      <p className="mb-3 text-xs text-muted">{t('blackjack.goal')}</p>

      <Scoreboard view={view} meId={meId} />

      {view.phase === 'playing' && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={!view.canHit} onClick={bj.hit}>
            {t('blackjack.hit')}
          </Button>
          <Button disabled={!view.canStand} onClick={bj.stand}>
            {t('blackjack.stand')}
          </Button>
          <span className={`text-sm ${bj.isMyTurn ? 'font-semibold text-primary' : 'text-muted'}`}>
            {bj.isMyTurn ? t('blackjack.yourTurn') : t('blackjack.turnOf', { name: bj.nameOf(view.turnId) })}
          </span>
        </div>
      )}
      {view.phase === 'between' && <p className="text-sm text-muted">{t('blackjack.next', { seconds: bj.seconds })}</p>}

      {view.phase === 'ended' && (
        <div className="text-center">
          <h2 className="mb-1 text-xl font-semibold">{t('blackjack.ended')}</h2>
          {winner && <p className="text-2xl font-bold text-good">{t('blackjack.winner', { name: bj.nameOf(winner.userId) })}</p>}
          {mine && mine.place !== 1 && <p className="text-sm text-muted">{t('blackjack.youPlace', { place: mine.place })}</p>}
          {view.results && (
            <ResultsTable
              meId={meId}
              rows={[...view.results].sort((a, b) => a.place - b.place).map((r) => ({ ...r, name: bj.nameOf(r.userId) }))}
            />
          )}
        </div>
      )}

      <EventLog log={view.log} nameOf={bj.nameOf} />
    </Card>
  );
}
