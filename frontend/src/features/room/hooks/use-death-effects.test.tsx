import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeathEffects } from '@/features/room/hooks/use-death-effects';
import { useSoundStore } from '@/shared/lib/sound-store';
import * as sounds from '@/shared/lib/sound-effects';
import { DEFAULT_HUMAN } from '@/shared/models/avatar';
import type { ImpostorView, RoomState } from '@/shared/models/realtime';

const avatar = DEFAULT_HUMAN;
const seat = (id: string, out = false) => ({ id, username: id, out, left: false, connected: true, voted: false });

const room = (id: string, outIds: string[] = [], withPlay = true): RoomState => ({
  id,
  game: 'impostor',
  hostId: 'a',
  status: 'playing',
  min: 3,
  max: 12,
  settings: {},
  chat: [],
  spectators: [],
  players: ['a', 'b', 'c'].map((u) => ({ id: u, username: u, connected: true, avatar })),
  play: withPlay
    ? ({
        type: 'impostor', phase: 'voting', round: 1, deadline: 0, now: 0, category: 'x', role: 'crew', word: 'w',
        players: ['a', 'b', 'c'].map((u) => seat(u, outIds.includes(u))),
        turnId: null, clues: [], result: null, guesserId: null, guess: null, winner: null, results: null, reveal: null,
      } satisfies ImpostorView)
    : null,
});

describe('useDeathEffects', () => {
  const shot = vi.spyOn(sounds, 'playGunshot').mockImplementation(() => {});

  beforeEach(() => {
    vi.useFakeTimers();
    shot.mockClear();
    useSoundStore.setState({ muted: false });
  });
  afterEach(() => vi.useRealTimers());

  it('dispara cuando alguien muere y marca su personaje como recién alcanzado', () => {
    const { result, rerender } = renderHook(({ r }) => useDeathEffects(r), { initialProps: { r: room('R1') } });
    expect(result.current.fresh.size).toBe(0);
    rerender({ r: room('R1', ['b']) });
    act(() => void vi.advanceTimersByTime(10));
    expect(shot).toHaveBeenCalledTimes(1);
    expect(result.current.fresh.has('b')).toBe(true);
    expect(result.current.dead.has('b')).toBe(true);
  });

  it('la nube "fresca" se apaga sola pero el jugador sigue marcado como fuera', () => {
    const { result, rerender } = renderHook(({ r }) => useDeathEffects(r), { initialProps: { r: room('R1') } });
    rerender({ r: room('R1', ['b']) });
    act(() => void vi.advanceTimersByTime(3500));
    expect(result.current.fresh.size).toBe(0);
    expect(result.current.dead.has('b')).toBe(true);
  });

  it('no dispara por quien ya estaba muerto cuando entras (p. ej. como espectador)', () => {
    renderHook(() => useDeathEffects(room('R1', ['b'])));
    act(() => void vi.advanceTimersByTime(1000));
    expect(shot).not.toHaveBeenCalled();
  });

  it('no vuelve a disparar por la misma muerte en actualizaciones posteriores', () => {
    const { rerender } = renderHook(({ r }) => useDeathEffects(r), { initialProps: { r: room('R1') } });
    rerender({ r: room('R1', ['b']) });
    rerender({ r: room('R1', ['b']) });
    act(() => void vi.advanceTimersByTime(1000));
    expect(shot).toHaveBeenCalledTimes(1);
  });

  it('separa los disparos cuando caen varios a la vez', () => {
    const { rerender } = renderHook(({ r }) => useDeathEffects(r), { initialProps: { r: room('R1') } });
    rerender({ r: room('R1', ['a', 'b']) });
    act(() => void vi.advanceTimersByTime(10));
    expect(shot).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(400));
    expect(shot).toHaveBeenCalledTimes(2);
  });

  it('en una revancha (sin partida) se limpia y la siguiente muerte vuelve a disparar', () => {
    const { rerender } = renderHook(({ r }) => useDeathEffects(r), { initialProps: { r: room('R1', ['b']) } });
    rerender({ r: room('R1', [], false) });
    rerender({ r: room('R1') });
    rerender({ r: room('R1', ['c']) });
    act(() => void vi.advanceTimersByTime(10));
    expect(shot).toHaveBeenCalledTimes(1);
  });

  it('en silencio no suena, pero el humo igual aparece', () => {
    useSoundStore.setState({ muted: true });
    const { result, rerender } = renderHook(({ r }) => useDeathEffects(r), { initialProps: { r: room('R1') } });
    rerender({ r: room('R1', ['b']) });
    act(() => void vi.advanceTimersByTime(10));
    expect(shot).not.toHaveBeenCalled();
    expect(result.current.fresh.has('b')).toBe(true);
  });
});
