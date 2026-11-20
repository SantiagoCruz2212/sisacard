import { useEffect, useRef, useState } from 'react';
import type { UnoLogEntry } from '@/shared/models/realtime';

export interface DiceRoll {
  id: number;
  rollerId: string;
  /** Quien robó lo que salió (la entrada de robo que sigue al dado). */
  victimId: string | null;
  sides: number;
  roll: number;
}

/** Cuánto rueda el dado antes de caer, y cuánto se muestra en total. */
export const ROLL_MS = 1100;
export const SHOW_MS = 3200;

/** La tirada más reciente con id mayor que `seenId` (o null si no hay ninguna nueva). */
export function latestNewRoll(log: UnoLogEntry[], seenId: number): DiceRoll | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i] as UnoLogEntry;
    if (e.id <= seenId) break;
    if (e.kind !== 'dice' || !e.roll || !e.count) continue;
    const next = log[i + 1];
    return { id: e.id, rollerId: e.userId, victimId: next?.kind === 'draw' ? next.userId : null, sides: e.count, roll: e.roll };
  }
  return null;
}

/**
 * Tirada de dado que hay que animar ahora. Las tiradas que ya estaban en el registro al entrar
 * (o al refrescar) no se repiten; si empieza una partida nueva (los ids vuelven a empezar), se reinicia.
 */
export function useDiceRolls(log: UnoLogEntry[] | undefined) {
  const seen = useRef<number | null>(null);
  const [roll, setRoll] = useState<DiceRoll | null>(null);

  useEffect(() => {
    if (!log) return;
    const maxId = log.reduce((m, e) => Math.max(m, e.id), 0);
    if (seen.current === null) {
      seen.current = maxId;
      return;
    }
    if (maxId < seen.current) seen.current = 0; // partida nueva
    const next = latestNewRoll(log, seen.current);
    seen.current = Math.max(seen.current, maxId);
    if (next) setRoll(next);
  }, [log]);

  useEffect(() => {
    if (!roll) return;
    const timer = setTimeout(() => setRoll(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [roll]);

  return roll;
}
