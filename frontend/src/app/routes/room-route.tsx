import { AmongUsView } from '@/features/amongus/views/amongus-view';
import { BlackjackView } from '@/features/blackjack/views/blackjack-view';
import { ImpostorView } from '@/features/impostor/views/impostor-view';
import { RoomView } from '@/features/room/views/room-view';
import { RouletteView } from '@/features/roulette/views/roulette-view';
import { UnoView } from '@/features/uno/views/uno-view';
import { useCurrentRoom } from '@/shared/hooks/use-realtime';

/** Composición: un feature no importa a otro, así que la capa app une la sala con el juego en curso. */
export function RoomRoute() {
  const room = useCurrentRoom();
  return (
    <RoomView>
      {room?.play?.type === 'impostor' ? (
        <ImpostorView />
      ) : room?.play?.type === 'uno' ? (
        <UnoView />
      ) : room?.play?.type === 'blackjack' ? (
        <BlackjackView />
      ) : room?.play?.type === 'roulette' ? (
        <RouletteView />
      ) : room?.play?.type === 'amongus' ? (
        <AmongUsView />
      ) : null}
    </RoomView>
  );
}
