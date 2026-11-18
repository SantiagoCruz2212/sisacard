import { useTranslation } from 'react-i18next';
import { AnswerForm } from '@/features/impostor/components/answer-form';
import { ClueList } from '@/features/impostor/components/clue-list';
import { RoleBanner } from '@/features/impostor/components/role-banner';
import type { PhaseProps } from '@/features/impostor/models/phase-props';
import { Card } from '@/shared/ui/card';
import { Chip } from '@/shared/ui/chip';

export function CluesPhase({ view, meId, seconds, nameOf, onClue }: PhaseProps & { onClue: (text: string) => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <RoleBanner view={view} />
      <h3 className="mb-2 text-base font-semibold">
        {t('impostor.cluesTitle', { round: view.round })}
        <span className="float-right text-primary">{seconds}s</span>
      </h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {view.players.map((p) => (
          <Chip key={p.id} variant={p.id === view.turnId ? 'turn' : p.out ? 'off' : 'default'}>
            {p.username}
          </Chip>
        ))}
      </div>
      {view.turnId === meId ? (
        <AnswerForm
          placeholder={t('impostor.cluePlaceholder')}
          submitLabel={t('impostor.giveClue')}
          maxLength={30}
          onSubmit={onClue}
        />
      ) : (
        <p className="text-sm text-muted">{t('impostor.turnOf', { name: nameOf(view.turnId) })}</p>
      )}
      <ClueList clues={view.clues} nameOf={nameOf} />
    </Card>
  );
}
