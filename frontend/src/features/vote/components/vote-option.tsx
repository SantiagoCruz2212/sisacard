import { useTranslation } from 'react-i18next';
import type { GameId, GameVoteState } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';

interface VoteOptionProps {
  game: GameId;
  vote: GameVoteState;
  totalVotes: number;
  disabled: boolean;
  onVote: (game: GameId) => void;
}

export function VoteOption({ game, vote, totalVotes, disabled, onVote }: VoteOptionProps) {
  const { t } = useTranslation();
  const count = vote.tally[game];
  const mine = vote.myVote === game;
  const voters = vote.voters.filter((v) => v.game === game);
  const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;

  return (
    <div className="border-t border-line py-2 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <b>{t(`gameNames.${game}`)}</b>
        <span className="flex items-center gap-3 text-sm text-muted">
          {t('vote.votes', { count })}
          <Button variant={mine ? 'primary' : 'secondary'} disabled={disabled} onClick={() => onVote(game)}>
            {mine ? t('vote.yourVote') : t('vote.vote')}
          </Button>
        </span>
      </div>
      <div className="my-1.5 h-1.5 overflow-hidden rounded bg-bg">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex min-h-6 flex-wrap gap-1.5">
        {voters.length === 0 ? (
          <span className="text-xs text-muted">{t('vote.noVoters')}</span>
        ) : (
          voters.map((v) => <Chip key={v.userId}>{v.username}</Chip>)
        )}
      </div>
    </div>
  );
}
