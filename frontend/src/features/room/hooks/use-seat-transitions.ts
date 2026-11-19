import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RoomState } from '@/shared/models/realtime';

type Seat = RoomState['players'][number];

/** Un jugador que acaba de irse: se sigue dibujando en su silla mientras "sale" de la mesa. */
export interface Ghost {
  key: string;
  player: Seat;
  index: number;
  total: number;
  meIndex: number;
}

export const SEAT_ANIMATION_MS = 900;

/**
 * Detecta quién entra y quién sale de la mesa para animarlo.
 * - entering: quienes acaban de sentarse (durante SEAT_ANIMATION_MS).
 * - ghosts: quienes acaban de irse, con el lugar que ocupaban para poder dibujarlos saliendo.
 * La primera vista de una sala no anima nada (los que ya estaban sentados no "entran" de nuevo).
 */
export function useSeatTransitions(roomId: string | null, players: Seat[], meId: string) {
  const previous = useRef<{ roomId: string; players: Seat[] } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [entering, setEntering] = useState<Set<string>>(new Set());
  const [ghosts, setGhosts] = useState<Ghost[]>([]);

  // useLayoutEffect: el estado de animación se fija antes de pintar y no hay un fotograma de parpadeo.
  useLayoutEffect(() => {
    if (roomId === null) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    previous.current = { roomId, players };
    if (!before || before.roomId !== roomId) return;

    const nowIds = new Set(players.map((p) => p.id));
    const beforeIds = new Set(before.players.map((p) => p.id));
    const joined = players.filter((p) => !beforeIds.has(p.id)).map((p) => p.id);
    const left = before.players.map((player, index) => ({ player, index })).filter(({ player }) => !nowIds.has(player.id));

    if (joined.length > 0) {
      setEntering((s) => new Set([...s, ...joined]));
      timers.current.push(setTimeout(() => setEntering((s) => new Set([...s].filter((id) => !joined.includes(id)))), SEAT_ANIMATION_MS));
    }

    if (left.length > 0) {
      const meIndex = Math.max(
        0,
        before.players.findIndex((p) => p.id === meId),
      );
      const made = left.map(({ player, index }) => ({
        key: `${player.id}-${Date.now()}-${index}`,
        player,
        index,
        total: before.players.length,
        meIndex,
      }));
      setGhosts((g) => [...g, ...made]);
      timers.current.push(setTimeout(() => setGhosts((g) => g.filter((x) => !made.some((m) => m.key === x.key))), SEAT_ANIMATION_MS));
    }
  }, [roomId, players, meId]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  return { entering, ghosts };
}
