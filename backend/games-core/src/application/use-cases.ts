import { randomBytes } from 'node:crypto';
import type { GameAction } from '../domain/game.js';
import { GAMES, isGameId } from '../domain/games.js';
import { Room } from '../domain/room.js';
import { createChatMessage, DomainError, type Player, type Scheduler } from '../domain/shared.js';
import { parseAvatar } from '../domain/avatar.js';
import type {
  AvatarDirectory,
  ChatHistory,
  EventBus,
  PresenceRegistry,
  RealtimeNotifier,
  RoomRepository,
  StatsRepository,
} from './ports.js';
import { lobbyView, roomView } from './views.js';
import type { VotePublisher } from './vote-use-cases.js';

const OFFLINE_GRACE_MS = 15_000; // margen para refrescar la página sin perder el puesto
const DEAD_ROOM_MS = 120_000;

// ---------- servicios de apoyo ----------

export class RoomPublisher {
  constructor(
    private rooms: RoomRepository,
    private presence: PresenceRegistry,
    private notifier: RealtimeNotifier,
    private avatars: AvatarDirectory,
  ) {}

  room(room: Room) {
    for (const p of room.participants) {
      this.notifier.sendRoomState(p.id, roomView(room, p.id, this.presence.isOnline, (id) => this.avatars.get(id)));
    }
  }

  lobby() {
    this.notifier.broadcastLobby(lobbyView(this.rooms.list(), this.presence.onlineUsers()));
  }
}

export class RoomCloser {
  constructor(
    private rooms: RoomRepository,
    private notifier: RealtimeNotifier,
    private publisher: RoomPublisher,
  ) {}

  close(room: Room) {
    room.close();
    for (const p of room.participants) this.notifier.sendRoomState(p.id, null);
    this.rooms.delete(room.id);
    this.publisher.lobby();
  }
}

const requireRoom = (rooms: RoomRepository, userId: string) => {
  const room = rooms.findByUserId(userId);
  if (!room) throw new DomainError('No estás en una sala');
  return room;
};

// ---------- casos de uso ----------

export class CreateRoom {
  constructor(
    private rooms: RoomRepository,
    private publisher: RoomPublisher,
  ) {}

  execute(user: Player, gameId: unknown) {
    if (!isGameId(gameId)) throw new DomainError('Juego desconocido');
    if (this.rooms.findByUserId(user.id)) throw new DomainError('Ya estás en una sala');
    let id: string;
    do id = randomBytes(2).toString('hex').toUpperCase();
    while (this.rooms.findById(id));
    const room = new Room(id, user, GAMES[gameId]);
    this.rooms.save(room);
    this.publisher.room(room);
    this.publisher.lobby();
    return { roomId: id };
  }
}

export class JoinRoom {
  constructor(
    private rooms: RoomRepository,
    private publisher: RoomPublisher,
  ) {}

  execute(user: Player, roomId: unknown) {
    const room = this.rooms.findById(String(roomId));
    if (!room) throw new DomainError('La sala ya no existe', 404);
    if (this.rooms.findByUserId(user.id)) throw new DomainError('Ya estás en una sala');
    room.join(user);
    this.rooms.save(room);
    this.publisher.room(room);
    this.publisher.lobby();
  }
}

export class LeaveRoom {
  constructor(
    private rooms: RoomRepository,
    private presence: PresenceRegistry,
    private notifier: RealtimeNotifier,
    private publisher: RoomPublisher,
    private closer: RoomCloser,
  ) {}

  execute(userId: string) {
    const room = this.rooms.findByUserId(userId);
    if (!room) return;
    room.leave(userId, this.presence.isOnline);
    this.notifier.sendRoomState(userId, null);
    if (room.players.length === 0) return this.closer.close(room);
    this.rooms.save(room);
    this.publisher.room(room);
    this.publisher.lobby();
  }
}

export class StartGame {
  constructor(
    private rooms: RoomRepository,
    private presence: PresenceRegistry,
    private scheduler: Scheduler,
    private speed: number,
    private bus: EventBus,
    private publisher: RoomPublisher,
  ) {}

  execute(userId: string) {
    const room = requireRoom(this.rooms, userId);
    room.start(userId, this.presence.isOnline, (players) =>
      room.definition.create(players, {
        isOnline: this.presence.isOnline,
        scheduler: this.scheduler,
        speed: this.speed,
        onChange: () => this.publisher.room(room),
        onFinished: (outcome) =>
          this.bus.publish({
            type: 'game.finished',
            game: room.game,
            players,
            results: outcome.results,
            occurredAt: new Date().toISOString(),
          }),
      }),
    );
    this.rooms.save(room);
    this.publisher.room(room);
    this.publisher.lobby();
  }
}

export class RematchRoom {
  constructor(
    private rooms: RoomRepository,
    private presence: PresenceRegistry,
    private publisher: RoomPublisher,
  ) {}

  execute(userId: string) {
    const room = requireRoom(this.rooms, userId);
    room.rematch(userId, this.presence.isOnline);
    this.publisher.room(room);
    this.publisher.lobby();
  }
}

export class PerformGameAction {
  constructor(
    private rooms: RoomRepository,
    private publisher: RoomPublisher,
  ) {}

  execute(userId: string, action: GameAction) {
    const room = requireRoom(this.rooms, userId);
    if (!room.match) throw new DomainError('No hay partida en curso');
    room.match.action(userId, action);
    this.publisher.room(room);
  }
}

export class SendRoomMessage {
  constructor(
    private rooms: RoomRepository,
    private scheduler: Scheduler,
    private publisher: RoomPublisher,
  ) {}

  execute(user: Player, text: unknown) {
    const room = requireRoom(this.rooms, user.id);
    room.postMessage(createChatMessage(user, text, this.scheduler.now()));
    this.publisher.room(room);
  }
}

export class SendLobbyMessage {
  constructor(
    private history: ChatHistory,
    private scheduler: Scheduler,
    private notifier: RealtimeNotifier,
  ) {}

  execute(user: Player, text: unknown) {
    const message = createChatMessage(user, text, this.scheduler.now());
    this.history.append(message);
    this.notifier.broadcastLobbyMessage(message);
  }
}

export class GetLeaderboard {
  constructor(private stats: StatsRepository) {}

  execute(game: unknown) {
    return this.stats.leaderboard(isGameId(game) ? game : undefined, 50);
  }
}

export class GetAvatar {
  constructor(private avatars: AvatarDirectory) {}

  execute(userId: string) {
    return this.avatars.get(userId);
  }
}

export class UpdateAvatar {
  constructor(
    private avatars: AvatarDirectory,
    private rooms: RoomRepository,
    private publisher: RoomPublisher,
  ) {}

  execute(userId: string, raw: unknown) {
    const avatar = parseAvatar(raw);
    this.avatars.set(userId, avatar);
    const room = this.rooms.findByUserId(userId);
    if (room) this.publisher.room(room); // quienes están en la mesa lo ven al instante
    return avatar;
  }
}

export class GetPlayerStats {
  constructor(private stats: StatsRepository) {}

  execute(userId: string) {
    return this.stats.findByUser(userId);
  }
}

/** Conexión y desconexión de jugadores (varias pestañas por usuario, margen al refrescar, salas abandonadas). */
export class HandlePresence {
  private graceTimers = new Map<string, () => void>();
  private deadRoomTimers = new Map<string, () => void>();

  constructor(
    private presence: PresenceRegistry,
    private rooms: RoomRepository,
    private notifier: RealtimeNotifier,
    private history: ChatHistory,
    private publisher: RoomPublisher,
    private closer: RoomCloser,
    private leaveRoom: LeaveRoom,
    private scheduler: Scheduler,
    private votePublisher: VotePublisher,
  ) {}

  connected(user: Player, socketId: string) {
    this.presence.connect(user, socketId);
    this.graceTimers.get(user.id)?.();
    this.graceTimers.delete(user.id);
    this.notifier.sendLobbyHistory(user.id, this.history.recent());
    this.votePublisher.to(user.id);
    const room = this.rooms.findByUserId(user.id);
    if (room) {
      this.deadRoomTimers.get(room.id)?.();
      this.deadRoomTimers.delete(room.id);
      room.match?.presenceChanged();
      this.publisher.room(room);
    } else {
      this.notifier.sendRoomState(user.id, null);
    }
    this.publisher.lobby();
  }

  disconnected(user: Player, socketId: string) {
    if (!this.presence.disconnect(user.id, socketId)) return;
    this.publisher.lobby();
    const room = this.rooms.findByUserId(user.id);
    if (!room) return;
    // Los espectadores y la sala de espera se vacían tras un margen; en partida, los jugadores conservan su puesto.
    if (room.status === 'waiting' || room.isSpectator(user.id)) {
      this.graceTimers.set(
        user.id,
        this.scheduler.after(OFFLINE_GRACE_MS, () => {
          if (!this.presence.isOnline(user.id)) this.leaveRoom.execute(user.id);
        }),
      );
    } else {
      room.match?.presenceChanged();
    }
    this.publisher.room(room);
    if (room.players.every((p) => !this.presence.isOnline(p.id))) {
      this.deadRoomTimers.set(
        room.id,
        this.scheduler.after(DEAD_ROOM_MS, () => {
          if (this.rooms.findById(room.id)) this.closer.close(room);
        }),
      );
    }
  }
}
