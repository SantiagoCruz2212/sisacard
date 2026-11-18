import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/shared/config/i18n';
import { WaitingRoom } from '@/features/room/components/waiting-room';
import type { Avatar } from '@/shared/models/avatar';
import type { RoomState } from '@/shared/models/realtime';

const avatar: Avatar = { hair: 'short', hairColor: 0, skin: 0, eyes: 'normal', eyeColor: 0, mouth: 'smile', clothes: 'tshirt', clothesColor: 0 };

const room = (players: number): RoomState => ({
  id: 'AB12',
  game: 'impostor',
  hostId: 'u0',
  status: 'waiting',
  min: 3,
  max: 12,
  chat: [],
  play: null,
  spectators: [],
  players: Array.from({ length: players }, (_, i) => ({ id: `u${i}`, username: `jugador${i}`, connected: true, avatar })),
});

describe('WaitingRoom', () => {
  it('el anfitrión no puede empezar con menos de 3 jugadores', () => {
    render(<WaitingRoom room={room(2)} isHost onStart={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('el anfitrión empieza la partida con 3 jugadores', () => {
    const onStart = vi.fn();
    render(<WaitingRoom room={room(3)} isHost onStart={onStart} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('un jugador que no es anfitrión no ve el botón de empezar', () => {
    render(<WaitingRoom room={room(3)} isHost={false} onStart={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
