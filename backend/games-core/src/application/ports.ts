import type { Avatar } from '../domain/avatar.js';
import type { DomainEvent } from '../domain/events.js';
import type { GameVote } from '../domain/game-vote.js';
import type { Room } from '../domain/room.js';
import type { ChatMessage, Player } from '../domain/shared.js';
import type { GameVoteView, LobbyView, RoomView } from './views.js';

// ---- Puertos de salida (los implementa infrastructure/) ----

/**
 * Las salas y la presencia son estado efímero de tiempo real, por eso estos puertos son síncronos.
 * Si algún día se escala a varias instancias, se reemplazan por adaptadores sobre Redis.
 */
export interface RoomRepository {
  save(room: Room): void;
  findById(id: string): Room | undefined;
  findByUserId(userId: string): Room | undefined;
  delete(id: string): void;
  list(): Room[];
}

export interface PresenceRegistry {
  connect(user: Player, socketId: string): void;
  /** Devuelve true si el usuario quedó sin ninguna conexión. */
  disconnect(userId: string, socketId: string): boolean;
  isOnline(userId: string): boolean;
  onlineUsers(): Player[];
}

/** Una sola votación a la vez (la abierta o la última cerrada, que se muestra unos segundos). */
export interface GameVoteRepository {
  current(): GameVote | null;
  save(vote: GameVote): void;
  clear(): void;
}

export interface AvatarDirectory {
  /** Personaje guardado del jugador o, si no ha creado uno, el de por defecto. */
  get(userId: string): Avatar;
  set(userId: string, avatar: Avatar): void;
}

export interface ChatHistory {
  append(message: ChatMessage): void;
  recent(): ChatMessage[];
}

export type PlayerStats = Record<string, Record<string, number>>;

export interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  played: number;
  wins: number;
}

export interface StatsRepository {
  increment(userId: string, game: string, stat: string, by: number): Promise<void>;
  findByUser(userId: string): Promise<PlayerStats>;
  /** Guarda el nombre visible del jugador (games-core no consulta a auth-service). */
  rememberPlayer(userId: string, username: string): Promise<void>;
  /** Clasificación por puntos. Sin `game` suma todos los juegos. */
  leaderboard(game: string | undefined, limit: number): Promise<LeaderboardEntry[]>;
}

export interface EventBus {
  publish(event: DomainEvent): void;
  subscribe<T extends DomainEvent['type']>(
    type: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void> | void,
  ): void;
}

/** Cómo se entera la gente de lo que pasa; el transporte (Socket.IO) es un detalle de infraestructura. */
export interface RealtimeNotifier {
  sendRoomState(userId: string, view: RoomView | null): void;
  broadcastLobby(view: LobbyView): void;
  sendLobbyHistory(userId: string, messages: ChatMessage[]): void;
  broadcastLobbyMessage(message: ChatMessage): void;
  sendVoteState(userId: string, view: GameVoteView | null): void;
}

/** Monedas y objetos comprados de cada jugador. Síncrono, igual que el directorio de personajes. */
export interface WalletRepository {
  balance(userId: string): number;
  credit(userId: string, amount: number): void;
  owned(userId: string): string[];
  /** Descuenta el precio y registra la compra de forma atómica. Devuelve false si no alcanzan las monedas. */
  purchase(userId: string, itemId: string, price: number): boolean;
}
