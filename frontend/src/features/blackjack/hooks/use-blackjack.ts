import { useCallback } from 'react';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import { useTurnBell } from '@/shared/hooks/use-turn-bell';

export function useBlackjack() {
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  const view = room?.play?.type === 'blackjack' ? room.play : null;
  const seconds = useCountdown(view?.deadline ?? 0, view?.now ?? 0);
  const meId = user?.id ?? '';
  const isMyTurn = Boolean(view && view.phase === 'playing' && view.turnId === meId);
  // Suena la campana cuando te toca pedir o plantarte.
  useTurnBell(isMyTurn);

  const nameOf = useCallback(
    (id: string | null | undefined) => view?.players.find((p) => p.id === id)?.username ?? '?',
    [view],
  );

  return {
    view,
    meId,
    seconds,
    isMyTurn,
    nameOf,
    hit: useCallback(() => call('game:action', { type: 'hit' }), [call]),
    stand: useCallback(() => call('game:action', { type: 'stand' }), [call]),
  };
}
