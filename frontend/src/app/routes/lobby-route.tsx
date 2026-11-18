import { LobbyView } from '@/features/lobby/views/lobby-view';
import { VoteView } from '@/features/vote/views/vote-view';

/** Composición: el lobby muestra el panel de votación de juegos. */
export function LobbyRoute() {
  return (
    <LobbyView>
      <VoteView />
    </LobbyView>
  );
}
