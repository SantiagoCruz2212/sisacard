import { useTranslation } from 'react-i18next';
import { ClueList } from '@/features/impostor/components/clue-list';
import type { PhaseProps } from '@/features/impostor/models/phase-props';
import { Card } from '@/shared/ui/card';
import { ResultsTable } from '@/shared/ui/results-table';

export function EndedPhase({ view, meId, nameOf }: PhaseProps) {
  const { t } = useTranslation();
  const crewWon = view.winner === 'crew';
  const iWon = crewWon !== (view.role === 'impostor');
  return (
    <Card className="text-center">
      {view.role !== 'spectator' && (
        <h2 className="mb-2 text-xl font-semibold">{t(iWon ? 'impostor.youWon' : 'impostor.youLost')}</h2>
      )}
      <div className={`my-3 text-3xl font-bold ${crewWon ? 'text-good' : 'text-bad'}`}>
        {t(crewWon ? 'impostor.crewWon' : 'impostor.impostorWon')}
      </div>
      <p className="mb-2">
        {t('impostor.revealLine', {
          word: view.reveal?.word,
          impostors: view.reveal?.impostors.map(nameOf).join(', '),
        })}
      </p>
      {view.guess && (
        <p className="text-sm text-muted">
          {t('impostor.impostorGuessed', {
            text: view.guess.text,
            verdict: view.guess.correct ? t('impostor.correct') : t('impostor.incorrect'),
          })}
        </p>
      )}
      {view.results && (
        <ResultsTable
          meId={meId}
          rows={[...view.results]
            .sort((a, b) => a.place - b.place)
            .map((r) => ({ ...r, name: nameOf(r.userId) }))}
        />
      )}
      <ClueList clues={view.clues} nameOf={nameOf} />
    </Card>
  );
}
