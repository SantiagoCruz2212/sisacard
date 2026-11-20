import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { latestNewRoll, SHOW_MS, useDiceRolls } from '@/features/uno/hooks/use-dice-rolls';
import type { UnoLogEntry } from '@/shared/models/realtime';

const play = (id: number): UnoLogEntry => ({ id, userId: 'a', kind: 'play' });
const dice = (id: number, roll: number, sides = 20): UnoLogEntry => ({ id, userId: 'a', kind: 'dice', roll, count: sides });
const draw = (id: number, count: number): UnoLogEntry => ({ id, userId: 'b', kind: 'draw', count });

describe('latestNewRoll', () => {
  it('encuentra la tirada nueva con quien robó', () => {
    expect(latestNewRoll([play(1), play(2), dice(3, 13), draw(4, 13)], 2)).toEqual({
      id: 3,
      rollerId: 'a',
      victimId: 'b',
      sides: 20,
      roll: 13,
    });
  });

  it('ignora tiradas ya vistas', () => {
    expect(latestNewRoll([dice(3, 13), draw(4, 13), play(5)], 4)).toBeNull();
  });
});

describe('useDiceRolls', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no repite las tiradas que ya estaban al entrar, anima las nuevas y luego se oculta', () => {
    const { result, rerender } = renderHook(({ log }) => useDiceRolls(log), {
      initialProps: { log: [dice(1, 5), draw(2, 5)] },
    });
    expect(result.current).toBeNull();

    rerender({ log: [dice(1, 5), draw(2, 5), dice(3, 17), draw(4, 17)] });
    expect(result.current).toMatchObject({ id: 3, roll: 17, victimId: 'b' });

    act(() => vi.advanceTimersByTime(SHOW_MS));
    expect(result.current).toBeNull();

    // Otra actualización sin tiradas nuevas no vuelve a animar.
    rerender({ log: [dice(1, 5), draw(2, 5), dice(3, 17), draw(4, 17), play(5)] });
    expect(result.current).toBeNull();
  });

  it('en una partida nueva (ids desde cero) vuelve a animar', () => {
    const { result, rerender } = renderHook(({ log }) => useDiceRolls(log), {
      initialProps: { log: [play(40), play(41)] },
    });
    rerender({ log: [] as UnoLogEntry[] });
    rerender({ log: [play(1), dice(2, 3, 6), draw(3, 3)] });
    expect(result.current).toMatchObject({ id: 2, roll: 3, sides: 6 });
  });
});
