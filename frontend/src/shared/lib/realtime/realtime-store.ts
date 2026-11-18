import { create } from 'zustand';
import type { ChatMessage, GameVoteState, LobbyState, RoomState } from '@/shared/models/realtime';

interface RealtimeState {
  connected: boolean;
  lobby: LobbyState;
  lobbyChat: ChatMessage[];
  room: RoomState | null;
  vote: GameVoteState | null;
  reset: () => void;
}

const initial = { connected: false, lobby: { online: [], rooms: [] }, lobbyChat: [], room: null, vote: null };

/** Estado empujado por el servidor en tiempo real (lobby, chat general, sala actual). */
export const useRealtimeStore = create<RealtimeState>()((set) => ({
  ...initial,
  reset: () => set(initial),
}));
