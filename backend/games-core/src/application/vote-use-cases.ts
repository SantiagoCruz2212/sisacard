import { randomUUID } from 'node:crypto';
import { GameVote } from '../domain/game-vote.js';
import type { GameId } from '../domain/game.js';
import { GAMES } from '../domain/games.js';
import { DomainError, type Player, type Scheduler } from '../domain/shared.js';
import type { GameVoteRepository, PresenceRegistry, RealtimeNotifier, RoomRepository } from './ports.js';
import type { CreateRoom, JoinRoom } from './use-cases.js';
import { gameVoteView } from './views.js';

const VOTE_MS = 30_000;
const RESULT_VISIBLE_MS = 20_000;

export class VotePublisher {
  constructor(
    private votes: GameVoteRepository,
    private presence: PresenceRegistry,
    private notifier: RealtimeNotifier,
    private scheduler: Scheduler,
  ) {}

  /** Envía el estado de la votación (o null) a un usuario concreto. */
  to(userId: string) {
    const vote = this.votes.current();
    this.notifier.sendVoteState(userId, vote ? gameVoteView(vote, userId, this.scheduler.now()) : null);
  }

  all() {
    for (const u of this.presence.onlineUsers()) this.to(u.id);
  }
}

export class StartGameVote {
  constructor(
    private votes: GameVoteRepository,
    private rooms: RoomRepository,
    private scheduler: Scheduler,
    private speed: number,
    private publisher: VotePublisher,
    private closer: CloseGameVote,
  ) {}

  execute(user: Player) {
    if (this.rooms.findByUserId(user.id)) throw new DomainError('Sal de tu sala para iniciar una votación');
    const current = this.votes.current();
    if (current?.status === 'open') throw new DomainError('Ya hay una votación en curso');
    const ms = VOTE_MS * this.speed;
    const vote = new GameVote(randomUUID(), user, Object.keys(GAMES) as GameId[], this.scheduler.now() + ms);
    this.votes.save(vote);
    this.publisher.all();
    this.scheduler.after(ms, () => this.closer.execute(vote.id));
  }
}

export class CastGameVote {
  constructor(
    private votes: GameVoteRepository,
    private rooms: RoomRepository,
    private presence: PresenceRegistry,
    private publisher: VotePublisher,
    private closer: CloseGameVote,
  ) {}

  execute(user: Player, game: unknown) {
    const vote = this.votes.current();
    if (!vote || vote.status !== 'open') throw new DomainError('No hay una votación abierta');
    if (this.rooms.findByUserId(user.id)) throw new DomainError('Sal de tu sala para votar');
    vote.cast(user, game);
    this.publisher.all();
    // Si ya votaron todos los que están en el lobby, no hace falta esperar al reloj.
    const waiting = this.presence.onlineUsers().filter((u) => !this.rooms.findByUserId(u.id));
    if (waiting.every((u) => vote.hasVoted(u.id))) this.closer.execute(vote.id);
  }
}

/**
 * Cierra la votación: crea la sala del juego ganador y mete en ella a quienes votaron por ese juego.
 * El anfitrión es quien inició la votación (si sigue libre); si no, el primer votante del ganador.
 */
export class CloseGameVote {
  constructor(
    private votes: GameVoteRepository,
    private rooms: RoomRepository,
    private presence: PresenceRegistry,
    private scheduler: Scheduler,
    private speed: number,
    private publisher: VotePublisher,
    private createRoom: CreateRoom,
    private joinRoom: JoinRoom,
  ) {}

  execute(voteId: string) {
    const vote = this.votes.current();
    if (!vote || vote.id !== voteId || vote.status !== 'open') return;
    const winner = vote.close();

    if (winner) {
      const free = (p: Player) => this.presence.isOnline(p.id) && !this.rooms.findByUserId(p.id);
      const supporters = vote.votersFor(winner).filter(free);
      const host = free(vote.startedBy) ? vote.startedBy : supporters[0];
      if (host) {
        const { roomId } = this.createRoom.execute(host, winner);
        vote.roomId = roomId;
        for (const p of supporters.filter((s) => s.id !== host.id)) {
          try {
            this.joinRoom.execute(p, roomId);
          } catch (e) {
            if (!(e instanceof DomainError)) throw e; // sala llena: el resto la ve en la lista
          }
        }
      }
    }

    this.publisher.all();
    this.scheduler.after(RESULT_VISIBLE_MS * this.speed, () => {
      if (this.votes.current()?.id === vote.id) {
        this.votes.clear();
        this.publisher.all();
      }
    });
  }
}
