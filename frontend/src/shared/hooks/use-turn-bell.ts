import { useEffect, useRef } from 'react';
import { playBell } from '@/shared/lib/sound-effects';
import { useSoundStore } from '@/shared/lib/sound-store';

/** Hace sonar la campana en el instante en que `isMyTurn` pasa de falso a verdadero. */
export function useTurnBell(isMyTurn: boolean) {
  const muted = useSoundStore((s) => s.muted);
  const was = useRef(false);

  useEffect(() => {
    if (isMyTurn && !was.current && !muted) playBell();
    was.current = isMyTurn;
  }, [isMyTurn, muted]);
}
