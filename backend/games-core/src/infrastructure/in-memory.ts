import type { DomainEvent } from '../domain/events.js';
import type { GameVote } from '../domain/game-vote.js';
import type { Room } from '../domain/room.js';
import type { ChatMessage, Player, Scheduler } from '../domain/shared.js';
import type { ChatHistory, EventBus, GameVoteRepository, PresenceRegistry, RoomRepository } from '../application/ports.js';

export class InMemoryRoomRepository implements RoomRepository {
  private rooms = new Map<string, Room>();

  save(room: Room) {
    this.rooms.set(room.id, room);
  }
  findById(id: string) {
    return this.rooms.get(id);
  }
  findByUserId(userId: string) {
    return [...this.rooms.values()].find((r) => r.has(userId));
  }
  delete(id: string) {
    this.rooms.delete(id);
  }
  list() {
    return [...this.rooms.values()];
  }
}

export class InMemoryPresenceRegistry implements PresenceRegistry {
  private sockets = new Map<string, Set<string>>();
  private users = new Map<string, Player>();

  connect(user: Player, socketId: string) {
    const set = this.sockets.get(user.id) ?? new Set<string>();
    set.add(socketId);
    this.sockets.set(user.id, set);
    this.users.set(user.id, user);
  }

  disconnect(userId: string, socketId: string) {
    const set = this.sockets.get(userId);
    set?.delete(socketId);
    if (set && set.size > 0) return false;
    this.sockets.delete(userId);
    this.users.delete(userId);
    return true;
  }

  // Función flecha: se pasa suelta como callback `isOnline`.
  isOnline = (userId: string) => (this.sockets.get(userId)?.size ?? 0) > 0;

  onlineUsers() {
    return [...this.users.values()];
  }
}

export class InMemoryGameVoteRepository implements GameVoteRepository {
  private vote: GameVote | null = null;

  current() {
    return this.vote;
  }
  save(vote: GameVote) {
    this.vote = vote;
  }
  clear() {
    this.vote = null;
  }
}

export class InMemoryChatHistory implements ChatHistory {
  private messages: ChatMessage[] = [];

  append(message: ChatMessage) {
    this.messages = [...this.messages, message].slice(-100);
  }
  recent() {
    return this.messages;
  }
}

export class InProcessEventBus implements EventBus {
  private handlers = new Map<string, ((e: never) => Promise<void> | void)[]>();

  publish(event: DomainEvent) {
    for (const handler of this.handlers.get(event.type) ?? []) {
      Promise.resolve()
        .then(() => (handler as (e: DomainEvent) => Promise<void> | void)(event))
        .catch((err) => console.error(`Error manejando ${event.type}`, err));
    }
  }

  subscribe<T extends DomainEvent['type']>(
    type: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void> | void,
  ) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler as (e: never) => Promise<void> | void]);
  }
}

export class SystemScheduler implements Scheduler {
  now() {
    return Date.now();
  }
  after(ms: number, fn: () => void) {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  }
}
