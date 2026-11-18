import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/shared/config/i18n';
import { Hand } from '@/features/uno/components/hand';
import { usePrivacyStore } from '@/shared/lib/privacy-store';
import type { UnoView } from '@/shared/models/realtime';

const view: UnoView = {
  type: 'uno',
  phase: 'playing',
  deadline: 0,
  now: 0,
  players: [],
  myHand: [
    { id: 1, color: 'red', value: '7' },
    { id: 2, color: 'blue', value: 'skip' },
  ],
  playable: [1],
  top: { id: 9, color: 'red', value: '3' },
  currentColor: 'red',
  turnId: 'me',
  direction: 1,
  drawCount: 50,
  canDraw: true,
  canPass: false,
  log: [],
  results: null,
};

const props = (onSelect = vi.fn()) => ({
  view,
  isMyTurn: true,
  sayUno: false,
  pendingWild: null,
  onToggleUno: () => {},
  onSelect,
  onChooseColor: () => {},
  onCancelWild: () => {},
});

describe('Hand con la información oculta', () => {
  beforeAll(() => i18n.changeLanguage('es'));
  beforeEach(() => usePrivacyStore.setState({ hidden: false }));

  it('visible: muestra las cartas y deja jugar las jugables', () => {
    const onSelect = vi.fn();
    render(<Hand {...props(onSelect)} />);
    fireEvent.click(screen.getByRole('button', { name: /rojo 7/i }));
    expect(onSelect).toHaveBeenCalledWith(view.myHand[0]);
  });

  it('oculta: no se ve ningún valor ni color y no se puede jugar a ciegas', () => {
    usePrivacyStore.setState({ hidden: true });
    const onSelect = vi.fn();
    render(<Hand {...props(onSelect)} />);
    expect(screen.queryByRole('button', { name: /rojo 7/i })).toBeNull();
    expect(screen.queryByText('7')).toBeNull();
    expect(screen.getAllByText('UNO')).toHaveLength(2); // una carta boca abajo por cada carta de la mano
    expect(screen.getByText(/Información oculta/)).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
