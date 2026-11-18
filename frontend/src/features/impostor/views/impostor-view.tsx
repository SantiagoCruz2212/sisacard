import { CluesPhase } from '@/features/impostor/components/clues-phase';
import { EndedPhase } from '@/features/impostor/components/ended-phase';
import { GuessPhase } from '@/features/impostor/components/guess-phase';
import { ResultPhase } from '@/features/impostor/components/result-phase';
import { RevealPhase } from '@/features/impostor/components/reveal-phase';
import { VotingPhase } from '@/features/impostor/components/voting-phase';
import { useImpostor } from '@/features/impostor/hooks/use-impostor';

/** Pantalla del juego Impostor: elige el componente según la fase que dicta el servidor. */
export function ImpostorView() {
  const { view, meId, seconds, nameOf, sendClue, vote, guess } = useImpostor();
  if (!view) return null;
  const props = { view, meId, seconds, nameOf };

  switch (view.phase) {
    case 'reveal':
      return <RevealPhase {...props} />;
    case 'clues':
      return <CluesPhase {...props} onClue={sendClue} />;
    case 'voting':
      return <VotingPhase {...props} onVote={vote} />;
    case 'result':
      return <ResultPhase {...props} />;
    case 'guess':
      return <GuessPhase {...props} onGuess={guess} />;
    case 'ended':
      return <EndedPhase {...props} />;
  }
}
