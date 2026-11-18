import { useCallback, useState } from 'react';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import { useTurnBell } from '@/shared/hooks/use-turn-bell';
import type { UnoCard, UnoColor } from '@/shared/models/realtime';

export function useUno() {
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  const view = room?.play?.type === 'uno' ? room.play : null;
  const seconds = useCountdown(view?.deadline ?? 0, view?.now ?? 0);
  const meId = user?.id ?? '';
  // Suena la campana cuando te toca jugar.
  useTurnBell(Boolean(view && view.phase === 'playing' && view.turnId === meId));

  const [sayUno, setSayUno] = useState(false);
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);

  const nameOf = useCallback(
    (id: string | null) => view?.players.find((p) => p.id === id)?.username ?? '?',
    [view],
  );

  const send = useCallback(
    async (payload: object) => {
      const res = await call('game:action', payload);
      if (res.ok) {
        setSayUno(false);
        setPendingWild(null);
      }
      return res;
    },
    [call],
  );

  /** Los comodines piden color antes de jugarse; el resto se juega directo. */
  const selectCard = useCallback(
    (card: UnoCard) => {
      if (card.color === 'wild') setPendingWild(card);
      else void send({ type: 'play', cardId: card.id, uno: sayUno });
    },
    [send, sayUno],
  );

  const chooseColor = useCallback(
    (color: UnoColor) => {
      if (pendingWild) void send({ type: 'play', cardId: pendingWild.id, color, uno: sayUno });
    },
    [send, pendingWild, sayUno],
  );

  return {
    view,
    meId,
    seconds,
    nameOf,
    isMyTurn: view?.turnId === meId,
    sayUno,
    toggleUno: () => setSayUno((v) => !v),
    pendingWild,
    cancelWild: () => setPendingWild(null),
    selectCard,
    chooseColor,
    draw: useCallback(() => send({ type: 'draw' }), [send]),
    pass: useCallback(() => send({ type: 'pass' }), [send]),
  };
}
