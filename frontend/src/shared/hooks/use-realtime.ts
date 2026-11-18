import { useCallback } from 'react';
import { useRealtimeStore } from '@/shared/lib/realtime/realtime-store';
import { emitWithAck } from '@/shared/lib/realtime/socket-client';
import { useToast } from '@/shared/hooks/use-toast';

/** Enviar un evento al servidor; si falla, el motivo se muestra como toast. */
export function useRealtimeCall() {
  const showToast = useToast((s) => s.show);
  return useCallback(
    async (event: string, payload: object = {}) => {
      const res = await emitWithAck(event, payload);
      if (!res.ok && res.error) showToast(res.error);
      return res;
    },
    [showToast],
  );
}

export const useConnected = () => useRealtimeStore((s) => s.connected);
export const useLobbyState = () => useRealtimeStore((s) => s.lobby);
export const useLobbyChat = () => useRealtimeStore((s) => s.lobbyChat);
export const useCurrentRoom = () => useRealtimeStore((s) => s.room);
export const useGameVoteState = () => useRealtimeStore((s) => s.vote);
