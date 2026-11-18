import type { GameAction, GameMatch, MatchContext } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import { DomainError, type Player } from '../shared.js';

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export interface BjCard {
  id: number;
  rank: Rank;
  suit: Suit;
}
export type BjPhase = 'playing' | 'between' | 'ended';

export const TARGET = 21; // límite de cada mano
export const CUT_TARGET = 42; // 21 + 21: cada 2 rondas sale quien quedó más lejos
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const TURN_MS = 20_000;
const OFFLINE_TURN_MS = 1_500;
const BETWEEN_MS = 5_000; // pausa para ver el resultado de una ronda o de una eliminación

export function handValue(hand: BjCard[]): { value: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.rank === 'A') {
      aces++;
      total += 11;
    } else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K' || c.rank === '10') total += 10;
    else total += Number(c.rank);
  }
  while (total > TARGET && aces > 0) {
    total -= 10;
    aces--;
  }
  return { value: total, soft: aces > 0 };
}

/** Zapato de 2 barajas (104 cartas), mezclado. */
export function buildShoe(random: () => number = Math.random): BjCard[] {
  const shoe: BjCard[] = [];
  let id = 0;
  for (let deck = 0; deck < 2; deck++)
    for (const suit of SUITS) for (const rank of RANKS) shoe.push({ id: id++, rank, suit });
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j] as BjCard, shoe[i] as BjCard];
  }
  return shoe;
}

interface Seat extends Player {
  hand: BjCard[];
  status: 'waiting' | 'stood' | 'busted';
  out: boolean; // eliminado (por pasarse, por el corte de 42 o por irse)
  left: boolean;
  roundValues: number[]; // valor de la mano en cada ronda del ciclo actual
}

type EliminationReason = 'bust' | 'cut' | 'left';
interface Group {
  ids: string[];
  aliveBefore: number;
  reason: EliminationReason;
}

interface LogEntry {
  kind: 'bust' | 'round' | 'cut' | 'tie' | 'reset' | 'left';
  userId?: string;
  ids?: string[];
  value?: number;
  round?: number;
}

/**
 * Blackjack battle royale. Cada ronda todos juegan una mano sin pasarse de 21 (sin crupier).
 * - Quien se pasa queda eliminado al instante y el ciclo se reinicia (ronda 1, totales en cero).
 * - Al terminar la ronda 2 se suman las dos manos (máximo 42): sale quien quedó más lejos de 42.
 *   Si todos empatan no sale nadie. Tras un corte el ciclo también se reinicia.
 * - Gana el último en pie.
 */
export class BlackjackGame implements GameMatch {
  phase: BjPhase = 'playing';
  private seats: Seat[];
  private shoe: BjCard[] = [];
  private round = 1;
  private cycle = 1;
  private turn = -1;
  private groups: Group[] = [];
  private log: LogEntry[] = [];
  private results: { userId: string; place: number; points: number }[] | null = null;
  private deadline = 0;
  private cancelTimer: (() => void) | null = null;
  private armedOffline = false;
  private rand: () => number;

  constructor(
    players: Player[],
    private ctx: MatchContext,
    private makeShoe?: () => BjCard[],
  ) {
    this.rand = ctx.random ?? Math.random;
    this.seats = players.map((p) => ({ ...p, hand: [], status: 'waiting', out: false, left: false, roundValues: [] }));
  }

  // ---------- utilidades ----------
  private active() {
    return this.seats.filter((s) => !s.out);
  }
  private seatOf(id: string) {
    return this.seats.find((s) => s.id === id);
  }
  private push(entry: LogEntry) {
    this.log = [...this.log, entry].slice(-6);
  }
  private draw(): BjCard {
    if (this.shoe.length === 0) this.shoe = (this.makeShoe ?? (() => buildShoe(this.rand)))();
    return this.shoe.pop() as BjCard;
  }

  // ---------- ciclo de vida ----------
  start() {
    this.dealRound();
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

  private dealRound() {
    this.phase = 'playing';
    this.shoe = (this.makeShoe ?? (() => buildShoe(this.rand)))();
    const active = this.active();
    for (const s of active) {
      s.hand = [];
      s.status = 'waiting';
    }
    for (let i = 0; i < 2; i++) for (const s of active) s.hand.push(this.draw());
    for (const s of active) if (handValue(s.hand).value === TARGET) this.stand(s); // 21 directo: se planta solo
    this.turn = -1;
    this.nextTurn();
  }

  private stand(seat: Seat) {
    seat.status = 'stood';
    seat.roundValues[this.round - 1] = handValue(seat.hand).value;
  }

  private nextTurn() {
    const len = this.seats.length;
    for (let step = 1; step <= len; step++) {
      const idx = (this.turn + step + len * 2) % len;
      const s = this.seats[idx] as Seat;
      if (!s.out && s.status === 'waiting') {
        this.turn = idx;
        return this.armTurn();
      }
    }
    this.endRound();
  }

  private armTurn() {
    this.armedOffline = !this.ctx.isOnline((this.seats[this.turn] as Seat).id);
    this.setTurnTimer();
  }

  private setTurnTimer() {
    const ms = (this.armedOffline ? OFFLINE_TURN_MS : TURN_MS) * this.ctx.speed;
    this.schedule(ms, () => {
      // Sin tiempo (o desconectado): se planta con lo que tenga.
      const seat = this.seats[this.turn] as Seat;
      this.stand(seat);
      this.nextTurn();
    });
  }

  // ---------- acciones ----------
  action(userId: string, a: GameAction) {
    if (this.phase !== 'playing') throw new DomainError('Espera a la siguiente ronda');
    const seat = this.seatOf(userId);
    if (!seat || seat.out) throw new DomainError('No estás en la partida');
    if ((this.seats[this.turn] as Seat).id !== userId) throw new DomainError('No es tu turno');

    if (a.type === 'hit') {
      seat.hand.push(this.draw());
      const { value } = handValue(seat.hand);
      if (value > TARGET) return this.bust(seat, value);
      if (value === TARGET) {
        this.stand(seat);
        return this.nextTurn();
      }
      return this.armTurn(); // sigue siendo su turno: reinicia el reloj
    }
    if (a.type === 'stand') {
      this.stand(seat);
      return this.nextTurn();
    }
    throw new DomainError('Acción desconocida');
  }

  // ---------- eliminaciones ----------
  private eliminate(seats: Seat[], reason: EliminationReason) {
    this.groups.push({ ids: seats.map((s) => s.id), aliveBefore: this.active().length, reason });
    for (const s of seats) s.out = true;
  }

  private bust(seat: Seat, value: number) {
    seat.status = 'busted';
    this.eliminate([seat], 'bust');
    this.push({ kind: 'bust', userId: seat.id, value });
    if (this.active().length <= 1) return this.finish();
    this.push({ kind: 'reset' });
    this.pauseThen(() => this.restartCycle());
  }

  /** Reinicia el ciclo: ronda 1, totales en cero y mano nueva para todos los que siguen. */
  private restartCycle() {
    this.round = 1;
    this.cycle++;
    for (const s of this.seats) s.roundValues = [];
    this.dealRound();
  }

  private pauseThen(next: () => void) {
    this.phase = 'between';
    this.turn = -1;
    this.schedule(BETWEEN_MS * this.ctx.speed, next);
  }

  private endRound() {
    if (this.round === 1) {
      this.push({ kind: 'round', round: 1 });
      return this.pauseThen(() => {
        this.round = 2;
        this.dealRound();
      });
    }

    const active = this.active();
    const totals = active.map((s) => ({ seat: s, total: (s.roundValues[0] ?? 0) + (s.roundValues[1] ?? 0) }));
    const lowest = Math.min(...totals.map((t) => t.total));
    const losers = totals.filter((t) => t.total === lowest).map((t) => t.seat);

    if (losers.length === active.length) {
      this.push({ kind: 'tie', value: lowest }); // todos empatan: nadie sale
    } else {
      this.eliminate(losers, 'cut');
      this.push({ kind: 'cut', ids: losers.map((s) => s.id), value: lowest });
      if (this.active().length <= 1) return this.finish();
    }
    this.push({ kind: 'reset' });
    this.pauseThen(() => this.restartCycle());
  }

  // ---------- presencia ----------
  presenceChanged() {
    if (this.phase !== 'playing' || this.turn < 0) return;
    const offline = !this.ctx.isOnline((this.seats[this.turn] as Seat).id);
    if (offline !== this.armedOffline) {
      this.armedOffline = offline;
      this.setTurnTimer();
    }
  }

  playerLeft(userId: string) {
    const seat = this.seatOf(userId);
    if (!seat || seat.left || this.phase === 'ended') return;
    seat.left = true;
    if (seat.out) return; // ya estaba eliminado: su posición no cambia
    const wasTurn = this.phase === 'playing' && (this.seats[this.turn] as Seat)?.id === userId;
    this.eliminate([seat], 'left');
    this.push({ kind: 'left', userId });
    if (this.active().length <= 1) return this.finish();
    if (this.phase !== 'playing') return;
    if (wasTurn) this.nextTurn();
    else if (!this.active().some((s) => s.status === 'waiting')) this.endRound();
  }

  private finish() {
    if (this.phase === 'ended') return;
    this.destroy();
    this.phase = 'ended';
    this.deadline = 0;
    this.turn = -1;
    const total = this.seats.length;
    const placeOf = new Map<string, number>();
    const reasonOf = new Map<string, EliminationReason>();
    for (const g of this.groups) {
      for (const id of g.ids) {
        placeOf.set(id, g.aliveBefore - g.ids.length + 1); // posición con empate (1, 2, 3, 3…)
        reasonOf.set(id, g.reason);
      }
    }
    for (const s of this.active()) placeOf.set(s.id, 1);
    this.results = this.seats
      .map((s) => ({ userId: s.id, place: placeOf.get(s.id) ?? total }))
      .sort((a, b) => a.place - b.place)
      .map((r) => ({ ...r, points: pointsForPlace(r.place, total) }));
    this.ctx.onFinished({
      results: this.results.map((r) => {
        const reason = reasonOf.get(r.userId);
        return { userId: r.userId, place: r.place, extraStats: reason === 'bust' ? ['busts'] : reason === 'cut' ? ['cuts'] : [] };
      }),
    });
  }

  // ---------- vista (todas las manos son públicas) ----------
  view(userId: string) {
    const current = this.phase === 'playing' && this.turn >= 0 ? (this.seats[this.turn] as Seat) : null;
    const myTurn = current?.id === userId;
    return {
      type: 'blackjack' as const,
      phase: this.phase,
      round: this.round,
      cycle: this.cycle,
      target: TARGET,
      cutTarget: CUT_TARGET,
      deadline: this.deadline,
      now: this.ctx.scheduler.now(),
      players: this.seats.map((s) => {
        const { value, soft } = handValue(s.hand);
        return {
          id: s.id,
          username: s.username,
          cards: s.hand,
          value,
          soft,
          status: s.out ? (s.status === 'busted' ? ('busted' as const) : ('out' as const)) : s.status,
          out: s.out,
          left: s.left,
          connected: this.ctx.isOnline(s.id),
          roundValues: s.roundValues,
          total: s.roundValues.reduce((a, b) => a + b, 0),
        };
      }),
      turnId: current?.id ?? null,
      canHit: myTurn,
      canStand: myTurn,
      log: this.log,
      results: this.results,
    };
  }
}
