import { useEffect, useMemo, useState } from 'react';

/** Segundos restantes hasta `deadline`, corrigiendo la diferencia de reloj con el servidor. */
export function useCountdown(deadline: number, serverNow: number) {
  const offset = useMemo(() => serverNow - Date.now(), [serverNow]);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000));
}
