import { useTranslation } from 'react-i18next';
import { VoteOption } from '@/features/vote/components/vote-option';
import { useGameVote } from '@/features/vote/hooks/use-game-vote';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

/** Panel del lobby para decidir a qué se juega: iniciar, votar con tiempo y ver el resultado. */
export function VoteView() {
  const { t } = useTranslation();
  const { vote, seconds, totalVotes, isOpen, start, cast, joinRoom } = useGameVote();

  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold">
        {t('vote.title')}
        {isOpen && <span className="float-right text-primary">{seconds}s</span>}
      </h3>

      {!vote && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{t('vote.hint')}</p>
          <Button variant="primary" onClick={start}>
            {t('vote.start')}
          </Button>
        </div>
      )}

      {vote && (
        <>
          {isOpen && <p className="mb-1 text-xs text-muted">{t('vote.openBy', { name: vote.startedBy })}</p>}
          {vote.options.map((game) => (
            <VoteOption key={game} game={game} vote={vote} totalVotes={totalVotes} disabled={!isOpen} onVote={cast} />
          ))}
          {vote.status === 'closed' && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-bg p-3">
              {vote.result?.winner && vote.result.roomId ? (
                <>
                  <span className="font-semibold text-good">
                    {t('vote.winner', { game: t(`gameNames.${vote.result.winner}`) })} · {t('vote.room', { id: vote.result.roomId })}
                  </span>
                  <Button variant="primary" onClick={() => joinRoom(vote.result?.roomId ?? '')}>
                    {t('vote.join')}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted">{t('vote.noVotes')}</span>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
