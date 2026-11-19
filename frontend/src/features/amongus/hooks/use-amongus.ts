import { useCallback, useEffect, useRef } from 'react';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';

const KEYS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  w: 'up',
  arrowup: 'up',
  s: 'down',
  arrowdown: 'down',
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
};

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
};

/** Estado del Among Us: vista, teclas de movimiento (WASD / flechas) y acciones (E, Q, R). */
export function useAmongUs() {
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  const view = room?.play?.type === 'amongus' ? room.play : null;
  const meId = user?.id ?? '';
  const playing = view?.phase === 'playing';
  const seconds = useCountdown(view?.deadline ?? 0, view?.now ?? 0);
  const killSeconds = useCountdown(view?.me?.killIn ? view.now + view.me.killIn : 0, view?.now ?? 0);

  const pressed = useRef(new Set<'up' | 'down' | 'left' | 'right'>());
  const sent = useRef('0,0');

  const sendMove = useCallback(() => {
    const p = pressed.current;
    const dx = (p.has('right') ? 1 : 0) - (p.has('left') ? 1 : 0);
    const dy = (p.has('down') ? 1 : 0) - (p.has('up') ? 1 : 0);
    const key = `${dx},${dy}`;
    if (key === sent.current) return;
    sent.current = key;
    void call('game:action', { type: 'move', dx, dy });
  }, [call]);

  const task = useCallback(() => call('game:action', { type: 'task' }), [call]);
  const kill = useCallback(() => call('game:action', { type: 'kill' }), [call]);
  const report = useCallback(() => call('game:action', { type: 'report' }), [call]);
  const vote = useCallback((target: string | null) => call('game:action', { type: 'vote', target }), [call]);

  useEffect(() => {
    if (!playing) return;
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const dir = KEYS[k];
      if (dir) {
        e.preventDefault();
        pressed.current.add(dir);
        sendMove();
      } else if (!e.repeat && k === 'e') void task();
      else if (!e.repeat && k === 'q') void kill();
      else if (!e.repeat && k === 'r') void report();
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEYS[e.key.toLowerCase()];
      if (!dir) return;
      pressed.current.delete(dir);
      sendMove();
    };
    const stop = () => {
      pressed.current.clear();
      sendMove();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', stop);
      stop();
    };
  }, [playing, sendMove, task, kill, report]);

  const nameOf = useCallback(
    (id: string | null | undefined) =>
      view?.players.find((p) => p.id === id)?.username ?? room?.players.find((p) => p.id === id)?.username ?? '?',
    [view, room],
  );

  return { view, room, meId, seconds, killSeconds, nameOf, task, kill, report, vote };
}
