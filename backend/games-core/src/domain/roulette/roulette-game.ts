import type { GameAction, GameMatch, MatchContext } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import { DomainError, type Player } from '../shared.js';

export type RoulettePhase = 'playing' | 'between' | 'ended';

export const CHAMBERS = 6;
const TURN_MS = 15_000;
const OFFLINE_TURN_MS = 1_500;
const BETWEEN_MS = 3_000; // pausa tras un disparo para verlo

interface Seat extends Player {
  out: boolean;
  left: boolean;
  survived: number; // disparos que ha resistido
}

interface LogEntry {
  kind: 'click' | 'bang' | 'spin' | 'left' | 'timeout';
  userId: string;
}

/**
 * Ruleta rusa: un revólver de 6 cámaras con una sola bala. Por turnos cada jugador dispara contra sí mismo.
 * - "Disparar" avanza a la siguiente cámara: cada disparo seguro hace más probable la bala (1/6, 1/5… 1/1).
 * - "Girar" mezcla el tambor y dispara: siempre 1/6, pero pierde el avance acumulado.
 * - Quien recibe la bala queda eliminado y el arma se recarga. Gana el último en pie.
 */
export class RouletteGame implements GameMatch {
  phase: RoulettePhase = 'playing';
  private seats: Seat[];
  private turn = -1;
  private bullet = 0;
  private position = 0;
  private groups: { id: string; aliveBefore: number }[] = [];
  private log: LogEntry[] = [];
  private results: { userId: string; place: number; points: number }[] | null = null;
  private deadline = 0;
  private cancelTimer: (() => void) | null = null;
  private armedOffline = false;
  private rand: () => number;

  constructor(
    players: Player[],
    private ctx: MatchContext,
  ) {
    this.rand = ctx.random ?? Math.random;
    this.seats = players.map((p) => ({ ...p, out: false, left: false, survived: 0 }));
  }

  private active() {
    return this.seats.filter((s) => !s.out);
  }
  private seatOf(id: string) {
    return this.seats.find((s) => s.id === id);
  }
  private push(entry: LogEntry) {
    this.log = [...this.log, entry].slice(-6);
  }
  private reload() {
    this.bullet = Math.floor(this.rand() * CHAMBERS);
    this.position = 0;
  }

  start() {
    this.reload();
    this.turn = Math.floor(this.rand() * this.seats.length);
    this.turn = (this.turn - 1 + this.seats.length) % this.seats.length;
    this.nextTurn();
  }

  destroy() {
    this.cancelTimer?.();
    this.cancelTimer = null;
  }

  isFinished() {
    return this.phase === 'ended';
  }

  private schedule(ms: number, fn: () => void) {
    this.destroy();
    this.deadline = this.ctx.scheduler.now() + ms;
    this.cancelTimer = this.ctx.scheduler.after(ms, () => {
      fn();
      this.ctx.onChange();
    });
  }

  private nextTurn() {
    this.phase = 'playing';
    const len = this.seats.length;
    for (let step = 1; step <= len; step++) {
      const idx = (this.turn + step) % len;
      if (!(this.seats[idx] as Seat).out) {
        this.turn = idx;
        this.armedOffline = !this.ctx.isOnline((this.seats[idx] as Seat).id);
        return this.armTimer();
      }
    }
  }

  private armTimer() {
    const ms = (this.armedOffline ? OFFLINE_TURN_MS : TURN_MS) * this.ctx.speed;
    this.schedule(ms, () => {
      const seat = this.seats[this.turn] as Seat;
      this.push({ kind: 'timeout', userId: seat.id });
      this.fire(seat, false); // sin tiempo: dispara por él
    });
  }

  action(userId: string, a: GameAction) {
    if (this.phase !== 'playing') throw new DomainError('Espera el siguiente turno');
    const seat = this.seatOf(userId);
    if (!seat || seat.out) throw new DomainError('No estás en la partida');
    if ((this.seats[this.turn] as Seat).id !== userId) throw new DomainError('No es tu turno');
    if (a.type === 'pull') return this.fire(seat, false);
    if (a.type === 'spin') return this.fire(seat, true);
    throw new DomainError('Acción desconocida');
  }

  private fire(seat: Seat, spin: boolean) {
    if (spin) {
      this.reload();
      this.push({ kind: 'spin', userId: seat.id });
    }
    const hit = this.position === this.bullet;
    if (!hit) {
      this.position++;
      seat.survived++;
      this.push({ kind: 'click', userId: seat.id });
      return this.pauseThen(() => this.nextTurn());
    }
    this.groups.push({ id: seat.id, aliveBefore: this.active().length });
    seat.out = true;
    this.push({ kind: 'bang', userId: seat.id });
    this.reload();
    if (this.active().length <= 1) return this.finish();
    this.pauseThen(() => this.nextTurn());
  }

  private pauseThen(next: () => void) {
    this.phase = 'between';
    this.schedule(BETWEEN_MS * this.ctx.speed, next);
  }

  presenceChanged() {
    if (this.phase !== 'playing' || this.turn < 0) return;
    const offline = !this.ctx.isOnline((this.seats[this.turn] as Seat).id);
    if (offline !== this.armedOffline) {
      this.armedOffline = offline;
      this.armTimer();
    }
  }

  playerLeft(userId: string) {
    const seat = this.seatOf(userId);
    if (!seat || seat.left || this.phase === 'ended') return;
    seat.left = true;
    if (seat.out) return;
    const wasTurn = this.phase === 'playing' && (this.seats[this.turn] as Seat).id === userId;
    this.groups.push({ id: seat.id, aliveBefore: this.active().length });
    seat.out = true;
    this.push({ kind: 'left', userId });
    if (this.active().length <= 1) return this.finish();
    if (wasTurn) this.nextTurn();
  }

  private finish() {
    if (this.phase === 'ended') return;
    this.destroy();
    this.phase = 'ended';
    this.deadline = 0;
    const total = this.seats.length;
    const placeOf = new Map<string, number>();
    for (const g of this.groups) placeOf.set(g.id, g.aliveBefore);
    for (const s of this.active()) placeOf.set(s.id, 1);
    this.results = this.seats
      .map((s) => ({ userId: s.id, place: placeOf.get(s.id) ?? total }))
      .sort((a, b) => a.place - b.place)
      .map((r) => ({ ...r, points: pointsForPlace(r.place, total) }));
    this.ctx.onFinished({
      results: this.results.map((r) => ({
        userId: r.userId,
        place: r.place,
        extraStats: [...(r.place === 1 ? [] : ['bangs']), ...(this.seatOf(r.userId)?.survived ? ['clicks'] : [])],
      })),
    });
  }

  view(userId: string) {
    const current = this.phase === 'playing' && this.turn >= 0 ? (this.seats[this.turn] as Seat) : null;
    const myTurn = current?.id === userId;
    return {
      type: 'roulette' as const,
      phase: this.phase,
      chambers: CHAMBERS,
      position: this.position,
      deadline: this.deadline,
      now: this.ctx.scheduler.now(),
      players: this.seats.map((s) => ({
        id: s.id,
        username: s.username,
        out: s.out,
        left: s.left,
        connected: this.ctx.isOnline(s.id),
        survived: s.survived,
      })),
      turnId: current?.id ?? null,
      canAct: myTurn,
      log: this.log,
      results: this.results,
    };
  }
}
