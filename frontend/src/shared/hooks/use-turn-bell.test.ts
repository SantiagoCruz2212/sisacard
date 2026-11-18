import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTurnBell } from '@/shared/hooks/use-turn-bell';
import * as bell from '@/shared/lib/sound-effects';
import { useSoundStore } from '@/shared/lib/sound-store';

describe('useTurnBell', () => {
  const ring = vi.spyOn(bell, 'playBell').mockImplementation(() => {});

  beforeEach(() => {
    ring.mockClear();
    useSoundStore.setState({ muted: false });
  });

  it('suena al pasar a ser tu turno, no mientras sigue siendo tu turno', () => {
    const { rerender } = renderHook(({ turn }) => useTurnBell(turn), { initialProps: { turn: false } });
    expect(ring).not.toHaveBeenCalled();
    rerender({ turn: true });
    expect(ring).toHaveBeenCalledTimes(1);
    rerender({ turn: true });
    expect(ring).toHaveBeenCalledTimes(1);
  });

  it('vuelve a sonar en el siguiente turno', () => {
    const { rerender } = renderHook(({ turn }) => useTurnBell(turn), { initialProps: { turn: false } });
    rerender({ turn: true });
    rerender({ turn: false });
    rerender({ turn: true });
    expect(ring).toHaveBeenCalledTimes(2);
  });

  it('no suena si está silenciada', () => {
    useSoundStore.setState({ muted: true });
    const { rerender } = renderHook(({ turn }) => useTurnBell(turn), { initialProps: { turn: false } });
    rerender({ turn: true });
    expect(ring).not.toHaveBeenCalled();
  });
});
