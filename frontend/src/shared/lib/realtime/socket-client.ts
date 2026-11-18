import { io, type Socket } from 'socket.io-client';
import { http } from '@/shared/lib/http';
import { useRealtimeStore } from '@/shared/lib/realtime/realtime-store';
import type { ChatMessage, GameVoteState, LobbyState, RoomState } from '@/shared/models/realtime';

export interface Ack {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

let socket: Socket | null = null;

/**
 * Abre el WebSocket contra el mismo origen (el api-gateway lo enruta a games-core).
 * El navegador no permite cabeceras en WebSocket, por eso el token viaja en la query.
 */
export function connectRealtime(token: string) {
  disconnectRealtime();
  const set = useRealtimeStore.setState;
  const s = io({ query: { token } });
  socket = s;
  s.on('connect', () => set({ connected: true }));
  s.on('disconnect', () => set({ connected: false }));
  // Si el token venció, el gateway rechaza el handshake: /me devuelve 401 y http() limpia la sesión.
  s.on('connect_error', () => void http('/api/auth/me').catch(() => undefined));
  s.on('lobby:state', (lobby: LobbyState) => set({ lobby }));
  s.on('lobby:history', (lobbyChat: ChatMessage[]) => set({ lobbyChat }));
  s.on('lobby:chat', (m: ChatMessage) => set((st) => ({ lobbyChat: [...st.lobbyChat, m].slice(-100) })));
  s.on('room:state', (room: RoomState | null) => set({ room }));
  s.on('vote:state', (vote: GameVoteState | null) => set({ vote }));
}

export function disconnectRealtime() {
  socket?.close();
  socket = null;
  useRealtimeStore.getState().reset();
}

export function emitWithAck(event: string, payload: object = {}): Promise<Ack> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, error: 'Sin conexión' });
    socket.emit(event, payload, (res: Ack) => resolve(res));
  });
}
