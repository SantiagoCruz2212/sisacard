import type { GameDefinition, GameId, GameMatch } from './game.js';
import { DomainError, type ChatMessage, type Player } from './shared.js';

export type RoomStatus = 'waiting' | 'playing';

/** Agregado Room: aquí viven las reglas de la sala (aforo, anfitrión, estados) sin importar el juego. */
export class Room {
  hostId: string;
  players: Player[];
  /** Quienes entran con la partida ya empezada: ven la mesa pero no juegan. */
  spectators: Player[] = [];
  chat: ChatMessage[] = [];
  status: RoomStatus = 'waiting';
  match: GameMatch | null = null;

  constructor(
    readonly id: string,
    host: Player,
    readonly definition: GameDefinition,
  ) {
    this.hostId = host.id;
    this.players = [host];
  }

  get game(): GameId {
    return this.definition.id;
  }
  get minPlayers() {
    return this.definition.minPlayers;
  }
  get maxPlayers() {
    return this.definition.maxPlayers;
  }

  static readonly MAX_SPECTATORS = 20;

  get participants(): Player[] {
    return [...this.players, ...this.spectators];
  }

  isSpectator(userId: string) {
    return this.spectators.some((p) => p.id === userId);
  }

  has(userId: string) {
    return this.players.some((p) => p.id === userId) || this.isSpectator(userId);
  }

  join(player: Player) {
    if (this.has(player.id)) return;
    if (this.status === 'playing') {
      if (this.spectators.length >= Room.MAX_SPECTATORS) throw new DomainError('Hay demasiados espectadores');
      this.spectators.push(player);
      return;
    }
    if (this.players.length >= this.maxPlayers) throw new DomainError('La sala está llena');
    this.players.push(player);
  }

  leave(userId: string, isOnline: (id: string) => boolean) {
    if (this.isSpectator(userId)) {
      this.spectators = this.spectators.filter((p) => p.id !== userId);
      return;
    }
    if (this.status === 'playing') this.match?.playerLeft(userId);
    this.players = this.players.filter((p) => p.id !== userId);
    if (this.hostId === userId && this.players.length > 0) {
      this.hostId = (this.players.find((p) => isOnline(p.id)) ?? (this.players[0] as Player)).id;
    }
  }

  postMessage(message: ChatMessage) {
    this.chat = [...this.chat, message].slice(-100);
  }

  assertHost(userId: string) {
    if (this.hostId !== userId) throw new DomainError('Solo el anfitrión puede hacer eso');
  }

  start(userId: string, isOnline: (id: string) => boolean, createMatch: (players: Player[]) => GameMatch) {
    this.assertHost(userId);
    if (this.status !== 'waiting') throw new DomainError('La partida ya empezó');
    this.players = this.players.filter((p) => isOnline(p.id));
    if (this.players.length < this.minPlayers)
      throw new DomainError(`Se necesitan al menos ${this.minPlayers} jugadores conectados`);
    this.match = createMatch([...this.players]);
    this.status = 'playing';
    this.match.start();
  }

  rematch(userId: string, isOnline: (id: string) => boolean) {
    this.assertHost(userId);
    if (!this.match?.isFinished()) throw new DomainError('La partida no ha terminado');
    this.match.destroy();
    this.match = null;
    this.status = 'waiting';
    this.players = this.players.filter((p) => isOnline(p.id));
    // Los espectadores conectados pasan a ser jugadores de la siguiente partida (si hay cupo).
    for (const s of this.spectators.filter((p) => isOnline(p.id))) {
      if (this.players.length < this.maxPlayers) this.players.push(s);
    }
    this.spectators = [];
  }

  close() {
    this.match?.destroy();
  }
}
