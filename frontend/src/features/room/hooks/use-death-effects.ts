import { useEffect, useMemo, useRef, useState } from 'react';
import { playGunshot } from '@/shared/lib/sound-effects';
import { useSoundStore } from '@/shared/lib/sound-store';
import type { RoomState } from '@/shared/models/realtime';
import { deadPlayerIds } from '@/shared/utils/seat-info';

const FRESH_MS = 3000; // cuánto dura la nube de humo "fresca"
const SHOT_GAP_MS = 350; // separación entre disparos si caen varios a la vez
const MAX_SHOTS = 3; // para no ensordecer cuando pierde un equipo entero

/**
 * Observa la sala y, cuando alguien pasa a estar muerto o derrotado, suena un disparo y marca
 * al jugador como "recién alcanzado". Quien ya estaba muerto al entrar (o al mirar) no dispara nada.
 */
export function useDeathEffects(room: RoomState | null) {
  const muted = useSoundStore((s) => s.muted);
  const previous = useRef<{ roomId: string; dead: Set<string> } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const roomId = room?.id ?? null;
  const dead = useMemo(() => deadPlayerIds(room?.play ?? null), [room?.play]);

  useEffect(() => {
    if (roomId === null) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    previous.current = { roomId, dead };
    if (!before || before.roomId !== roomId) return;

    const added = [...dead].filter((id) => !before.dead.has(id));
    if (added.length === 0) return;

    setFresh((s) => new Set([...s, ...added]));
    timers.current.push(
      setTimeout(() => setFresh((s) => new Set([...s].filter((id) => !added.includes(id)))), FRESH_MS),
    );
    if (!muted) {
      added.slice(0, MAX_SHOTS).forEach((_, i) => {
        timers.current.push(setTimeout(playGunshot, i * SHOT_GAP_MS));
      });
    }
  }, [roomId, dead, muted]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  return { dead, fresh };
}
