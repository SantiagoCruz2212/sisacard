import { useCallback } from 'react';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';

export function useRoom() {
  const { user } = useSession();
  const room = useCurrentRoom();
  const call = useRealtimeCall();
  const isHost = Boolean(room && user && room.hostId === user.id);
  const isSpectator = Boolean(room && user && room.spectators.some((s) => s.id === user.id));

  return {
    room,
    user,
    isHost,
    isSpectator,
    gameEnded: room?.play?.phase === 'ended',
    leave: useCallback(() => call('room:leave'), [call]),
    start: useCallback(() => call('room:start'), [call]),
    rematch: useCallback(() => call('room:rematch'), [call]),
    sendMessage: useCallback((text: string) => call('room:chat', { text }), [call]),
  };
}
