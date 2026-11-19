import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEAT_ANIMATION_MS, useSeatTransitions } from '@/features/room/hooks/use-seat-transitions';
import { DEFAULT_HUMAN } from '@/shared/models/avatar';
import type { RoomState } from '@/shared/models/realtime';

const seat = (id: string): RoomState['players'][number] => ({ id, username: id, connected: true, avatar: DEFAULT_HUMAN });
const seats = (...ids: string[]) => ids.map(seat);

describe('useSeatTransitions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (initial: RoomState['players']) =>
    renderHook(({ id, players }) => useSeatTransitions(id, players, 'a'), { initialProps: { id: 'R1' as string | null, players: initial } });

  it('la primera vista de una sala no anima a quienes ya estaban sentados', () => {
    const { result } = setup(seats('a', 'b', 'c'));
    expect(result.current.entering.size).toBe(0);
    expect(result.current.ghosts).toHaveLength(0);
  });

  it('quien entra queda "entrando" un rato y luego se asienta', () => {
    const { result, rerender } = setup(seats('a', 'b'));
    rerender({ id: 'R1', players: seats('a', 'b', 'c') });
    expect(result.current.entering.has('c')).toBe(true);
    expect(result.current.entering.has('a')).toBe(false);
    act(() => void vi.advanceTimersByTime(SEAT_ANIMATION_MS + 50));
    expect(result.current.entering.size).toBe(0);
  });

  it('quien sale deja un fantasma en su silla anterior y desaparece al terminar', () => {
    const { result, rerender } = setup(seats('a', 'b', 'c'));
    rerender({ id: 'R1', players: seats('a', 'c') });
    expect(result.current.ghosts).toHaveLength(1);
    expect(result.current.ghosts[0]).toMatchObject({ index: 1, total: 3, meIndex: 0 });
    expect(result.current.ghosts[0]?.player.id).toBe('b');
    act(() => void vi.advanceTimersByTime(SEAT_ANIMATION_MS + 50));
    expect(result.current.ghosts).toHaveLength(0);
  });

  it('entrar y salir a la vez funciona', () => {
    const { result, rerender } = setup(seats('a', 'b'));
    rerender({ id: 'R1', players: seats('a', 'c') });
    expect(result.current.entering.has('c')).toBe(true);
    expect(result.current.ghosts.map((g) => g.player.id)).toEqual(['b']);
  });

  it('cambiar de sala no anima a nadie', () => {
    const { result, rerender } = setup(seats('a', 'b'));
    rerender({ id: 'R2', players: seats('a', 'x', 'y') });
    expect(result.current.entering.size).toBe(0);
    expect(result.current.ghosts).toHaveLength(0);
  });

  it('actualizaciones sin cambios de jugadores no generan animaciones', () => {
    const { result, rerender } = setup(seats('a', 'b'));
    rerender({ id: 'R1', players: seats('a', 'b') });
    expect(result.current.entering.size).toBe(0);
    expect(result.current.ghosts).toHaveLength(0);
  });
});
