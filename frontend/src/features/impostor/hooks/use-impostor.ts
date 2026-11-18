import { useCallback } from 'react';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import { useTurnBell } from '@/shared/hooks/use-turn-bell';

export function useImpostor() {
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  const view = room?.play?.type === 'impostor' ? room.play : null;
  const seconds = useCountdown(view?.deadline ?? 0, view?.now ?? 0);
  const meId = user?.id ?? '';
  // Suena la campana cuando te toca dar pista o adivinar la palabra.
  useTurnBell(Boolean(view && ((view.phase === 'clues' && view.turnId === meId) || (view.phase === 'guess' && view.guesserId === meId))));

  const act = useCallback((payload: object) => call('game:action', payload), [call]);
  const nameOf = useCallback(
    (id: string | null) => view?.players.find((p) => p.id === id)?.username ?? '?',
    [view],
  );

  return {
    view,
    meId,
    seconds,
    nameOf,
    sendClue: useCallback((text: string) => act({ type: 'clue', text }), [act]),
    vote: useCallback((target: string | null) => act({ type: 'vote', target }), [act]),
    guess: useCallback((text: string) => act({ type: 'guess', text }), [act]),
  };
}
