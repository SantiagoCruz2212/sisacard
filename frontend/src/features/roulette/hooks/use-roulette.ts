import { useCallback } from 'react';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import { useTurnBell } from '@/shared/hooks/use-turn-bell';

export function useRoulette() {
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  const view = room?.play?.type === 'roulette' ? room.play : null;
  const seconds = useCountdown(view?.deadline ?? 0, view?.now ?? 0);
  const meId = user?.id ?? '';
  const isMyTurn = Boolean(view && view.phase === 'playing' && view.turnId === meId);
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
    pull: useCallback(() => call('game:action', { type: 'pull' }), [call]),
    spin: useCallback(() => call('game:action', { type: 'spin' }), [call]),
  };
}
