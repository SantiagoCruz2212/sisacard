import { useCallback } from 'react';
import { useLobbyChat, useLobbyState, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import type { GameId } from '@/shared/models/realtime';

export function useLobby() {
  const { user, logout } = useSession();
  const lobby = useLobbyState();
  const chat = useLobbyChat();
  const call = useRealtimeCall();

  return {
    user,
    logout,
    lobby,
    chat,
    createRoom: useCallback((game: GameId) => call('room:create', { game }), [call]),
    joinRoom: useCallback((roomId: string) => call('room:join', { roomId }), [call]),
    sendMessage: useCallback((text: string) => call('lobby:chat', { text }), [call]),
  };
}
