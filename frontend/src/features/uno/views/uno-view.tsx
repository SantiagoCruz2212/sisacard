import { useTranslation } from 'react-i18next';
import { GameLog } from '@/features/uno/components/game-log';
import { Hand } from '@/features/uno/components/hand';
import { PlayersBar } from '@/features/uno/components/players-bar';
import { TableCenter } from '@/features/uno/components/table-center';
import { useUno } from '@/features/uno/hooks/use-uno';
import { Card } from '@/shared/ui/card';
import { ResultsTable } from '@/shared/ui/results-table';

/** Pantalla del juego UNO: jugadores, mesa, tu mano y el registro de jugadas. */
export function UnoView() {
  const { t } = useTranslation();
  const uno = useUno();
  const { view, meId } = uno;
  if (!view) return null;

  if (view.phase === 'ended') {
    const mine = view.results?.find((r) => r.userId === meId);
    return (
      <Card className="text-center">
        <h2 className="mb-2 text-xl font-semibold">{t('uno.ended')}</h2>
        {mine && <p className="mb-2 text-2xl font-bold text-good">{t('uno.youPlace', { place: mine.place })}</p>}
        {view.results && (
          <ResultsTable
            meId={meId}
            rows={[...view.results].sort((a, b) => a.place - b.place).map((r) => ({ ...r, name: uno.nameOf(r.userId) }))}
          />
        )}
      </Card>
    );
  }

  const me = view.players.find((p) => p.id === meId);
  return (
    <Card>
      <PlayersBar view={view} meId={meId} />
      <TableCenter view={view} seconds={uno.seconds} onDraw={uno.draw} onPass={uno.pass} />
      <p className={`mb-2 text-sm ${uno.isMyTurn ? 'font-semibold text-primary' : 'text-muted'}`}>
        {uno.isMyTurn ? (view.canPass ? t('uno.drawnHint') : t('uno.yourTurn')) : t('uno.turnOf', { name: uno.nameOf(view.turnId) })}
      </p>
      {!me ? (
        <p className="text-sm text-muted">{t('room.spectating')}</p>
      ) : me.place ? (
        <p className="text-sm text-good">{t('uno.out', { place: me.place })}</p>
      ) : (
        <Hand
          view={view}
          isMyTurn={uno.isMyTurn}
          sayUno={uno.sayUno}
          pendingWild={uno.pendingWild}
          onToggleUno={uno.toggleUno}
          onSelect={uno.selectCard}
          onChooseColor={uno.chooseColor}
          onCancelWild={uno.cancelWild}
        />
      )}
      <GameLog view={view} nameOf={uno.nameOf} />
    </Card>
  );
}
