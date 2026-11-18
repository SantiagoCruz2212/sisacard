import { useTranslation } from 'react-i18next';
import { ClueList } from '@/features/impostor/components/clue-list';
import { RoleBanner } from '@/features/impostor/components/role-banner';
import type { PhaseProps } from '@/features/impostor/models/phase-props';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export function VotingPhase({ view, meId, seconds, nameOf, onVote }: PhaseProps & { onVote: (target: string | null) => void }) {
  const { t } = useTranslation();
  const me = view.players.find((p) => p.id === meId);
  const voters = view.players.filter((p) => p.voted).map((p) => p.username);

  return (
    <Card>
      <RoleBanner view={view} />
      <h3 className="mb-2 text-base font-semibold">
        {t('impostor.votingTitle')}
        <span className="float-right text-primary">{seconds}s</span>
      </h3>
      {view.role === 'spectator' ? (
        <p className="text-sm text-muted">{t('impostor.spectatorBanner')}</p>
      ) : me?.out ? (
        <p className="text-sm text-muted">{t('impostor.eliminatedWatch')}</p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-2">
          {view.players
            .filter((p) => !p.out && p.id !== meId)
            .map((p) => (
              <Button key={p.id} variant={view.myVote === p.id ? 'primary' : 'secondary'} onClick={() => onVote(p.id)}>
                {p.username} {p.voted && '✅'}
              </Button>
            ))}
          <Button variant={view.myVote === null ? 'primary' : 'ghost'} onClick={() => onVote(null)}>
            {t('impostor.skipVote')}
          </Button>
        </div>
      )}
      <p className="text-sm text-muted">{t('impostor.voted', { names: voters.join(', ') || t('impostor.nobodyVoted') })}</p>
      <ClueList clues={view.clues} nameOf={nameOf} />
    </Card>
  );
}
