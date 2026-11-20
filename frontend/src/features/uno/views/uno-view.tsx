import { useTranslation } from 'react-i18next';
import { CardGuide } from '@/features/uno/components/card-guide';
import { DiceRollOverlay } from '@/features/uno/components/dice-roll-overlay';
import { ChoicePanel } from '@/features/uno/components/choice-panel';
import { GameLog } from '@/features/uno/components/game-log';
import { Hand } from '@/features/uno/components/hand';
import { PlayersBar } from '@/features/uno/components/players-bar';
import { RevealPanel } from '@/features/uno/components/reveal-panel';
import { TableCenter } from '@/features/uno/components/table-center';
import { useDiceRolls } from '@/features/uno/hooks/use-dice-rolls';
import { useUno } from '@/features/uno/hooks/use-uno';
import { Card } from '@/shared/ui/card';
import { ResultsTable } from '@/shared/ui/results-table';

/** Pantalla del juego UNO: jugadores, mesa, tu mano y el registro de jugadas. */
export function UnoView() {
  const { t } = useTranslation();
  const uno = useUno();
  const { view, meId } = uno;
  const diceRoll = useDiceRolls(view?.log);
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
  const vulnerable = view.players.find((p) => p.vulnerable && p.id !== meId);

  let hint: string;
  if (view.choosingId && view.choosingId !== meId) hint = t('uno.choosing', { name: uno.nameOf(view.choosingId) });
  else if (view.penalty && view.penalty.victimId !== meId)
    hint = t('uno.penaltyOther', { name: uno.nameOf(view.penalty.victimId), count: view.penalty.amount });
  else if (uno.isMyTurn) hint = view.canPass ? t('uno.drawnHint') : t('uno.yourTurn');
  else if (view.playable.length > 0) hint = t('uno.outOfTurnHint');
  else hint = t('uno.turnOf', { name: uno.nameOf(view.turnId) });

  return (
    <Card>
      {diceRoll && <DiceRollOverlay key={diceRoll.id} roll={diceRoll} nameOf={uno.nameOf} />}
      <PlayersBar view={view} meId={meId} onCatch={uno.catchPlayer} />
      <TableCenter view={view} meId={meId} seconds={uno.seconds} onDraw={uno.draw} onPass={uno.pass} />
      <RevealPanel view={view} seconds={uno.revealSeconds} nameOf={uno.nameOf} />
      <p className={`mb-2 text-sm ${uno.isMyTurn ? 'font-semibold text-primary' : 'text-muted'}`}>{hint}</p>
      {vulnerable && view.settings.catchUno && me && !me.left && (
        <p className="mb-2 text-sm font-semibold text-bad">{t('uno.canCatch', { name: vulnerable.username })}</p>
      )}
      {!me ? (
        <p className="text-sm text-muted">{t('room.spectating')}</p>
      ) : me.place ? (
        <p className="text-sm text-good">{t('uno.out', { place: me.place })}</p>
      ) : (
        <>
          <ChoicePanel uno={uno} />
          <Hand view={view} sayUno={uno.sayUno} onToggleUno={uno.toggleUno} onSelect={uno.selectCard} discardSel={uno.discardSel} />
        </>
      )}
      <GameLog view={view} nameOf={uno.nameOf} />
      <CardGuide settings={view.settings} className="mt-4" />
    </Card>
  );
}
