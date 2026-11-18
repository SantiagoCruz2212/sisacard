import { useTranslation } from 'react-i18next';
import { AnswerForm } from '@/features/impostor/components/answer-form';
import type { PhaseProps } from '@/features/impostor/models/phase-props';
import { Card } from '@/shared/ui/card';

export function GuessPhase({ view, meId, seconds, nameOf, onGuess }: PhaseProps & { onGuess: (text: string) => void }) {
  const { t } = useTranslation();
  return (
    <Card className="text-center">
      <h2 className="mb-2 text-xl font-semibold">{t('impostor.guessTitle')}</h2>
      {view.guesserId === meId ? (
        <>
          <p className="mb-3">{t('impostor.guessPrompt', { category: view.category })}</p>
          <AnswerForm
            placeholder={t('impostor.guessPlaceholder')}
            submitLabel={t('impostor.guessButton', { seconds })}
            maxLength={40}
            onSubmit={onGuess}
          />
        </>
      ) : (
        <p>{t('impostor.guessWaiting', { name: nameOf(view.guesserId), seconds })}</p>
      )}
    </Card>
  );
}
