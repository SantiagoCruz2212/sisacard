import type { GameAction, GameMatch, MatchContext } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import { DomainError, type Player } from '../shared.js';

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
export interface UnoCard {
  id: number;
  color: UnoColor | 'wild';
  value: UnoValue;
}
export type UnoPhase = 'playing' | 'ended';

export const COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];
const NUMBERS: UnoValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTIONS: UnoValue[] = ['skip', 'reverse', 'draw2'];
const HAND_SIZE = 7;
const TURN_MS = 30_000;
const OFFLINE_TURN_MS = 1_500;

/** Baraja oficial de 108 cartas. */
export function buildDeck(): UnoCard[] {
  let id = 0;
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push({ id: id++, color, value: '0' });
    for (const value of [...NUMBERS, ...ACTIONS]) {
      deck.push({ id: id++, color, value });
      deck.push({ id: id++, color, value });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: 'wild', value: 'wild' });
    deck.push({ id: id++, color: 'wild', value: 'wild4' });
  }
  return deck;
}

export const isPlayable = (card: UnoCard, top: UnoCard, currentColor: UnoColor) =>
  card.color === 'wild' || card.color === currentColor || card.value === top.value;

interface Seat extends Player {
  hand: UnoCard[];
  out: boolean; // se quedó sin cartas (terminó)
  left: boolean; // abandonó la partida
}

interface LogEntry {
  userId: string;
  kind: 'play' | 'draw' | 'unoPenalty' | 'finished' | 'timeout';
  card?: UnoCard;
  color?: UnoColor;
  count?: number;
  place?: number;
}

/**
 * UNO sin apilar +2/+4 y sin desafío al +4. Se juega hasta que queda un solo jugador:
 * el orden en que se quedan sin cartas es el ranking (1.º, 2.º, 3.º…).
 */
export class UnoGame implements GameMatch {
  phase: UnoPhase = 'playing';
  private seats: Seat[];
  private drawPile: UnoCard[] = [];
  private discard: UnoCard[] = [];
  private currentColor: UnoColor = 'red';
  private dir: 1 | -1 = 1;
  private current = 0;
  private drawnCardId: number | null = null;
  private finishedOrder: string[] = [];
  private leftOrder: string[] = [];
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
    this.seats = players.map((p) => ({ ...p, hand: [], out: false, left: false }));
  }

  // ---------- utilidades ----------
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  }
  private get top(): UnoCard {
    return this.discard[this.discard.length - 1] as UnoCard;
  }
  private seatOf(id: string) {
    return this.seats.find((s) => s.id === id);
  }
  private isActive = (s: Seat) => !s.out && !s.left;
  private activeSeats() {
    return this.seats.filter(this.isActive);
  }
  private currentSeat() {
    return this.seats[this.current] as Seat;
  }
  private push(entry: LogEntry) {
    this.log = [...this.log, entry].slice(-8);
  }

  private nextActive(from: number, steps: number): number {
    let idx = from;
    let remaining = steps;
    const len = this.seats.length;
    for (let guard = 0; remaining > 0 && guard < len * (steps + 1); guard++) {
      idx = (idx + this.dir + len) % len;
      if (this.isActive(this.seats[idx] as Seat)) remaining--;
    }
    return idx;
  }

  private drawFromPile(): UnoCard | undefined {
    if (this.drawPile.length === 0 && this.discard.length > 1) {
      const top = this.discard.pop() as UnoCard;
      this.drawPile = this.shuffle(this.discard);
      this.discard = [top];
    }
    return this.drawPile.pop();
  }

  private giveCards(seat: Seat, count: number): UnoCard[] {
    const drawn: UnoCard[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawFromPile();
      if (!card) break;
      seat.hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  // ---------- ciclo de vida ----------
  start() {
    this.drawPile = this.shuffle(buildDeck());
    for (const seat of this.seats) this.giveCards(seat, HAND_SIZE);
    // La primera carta de la mesa es siempre numérica.
    const skipped: UnoCard[] = [];
    let first = this.drawPile.pop() as UnoCard;
    while (!NUMBERS.includes(first.value) && first.value !== '0') {
      skipped.push(first);
      first = this.drawPile.pop() as UnoCard;
    }
    this.drawPile = [...skipped, ...this.drawPile];
    this.discard = [first];
    this.currentColor = first.color as UnoColor;
    this.current = Math.floor(this.rand() * this.seats.length);
    this.armTurn();
  }

  destroy() {
    this.cancelTimer?.();
    this.cancelTimer = null;
  }

  isFinished() {
    return this.phase === 'ended';
  }

  private armTurn() {
    this.destroy();
    this.drawnCardId = null;
    if (this.phase === 'ended') return;
    this.armedOffline = !this.ctx.isOnline(this.currentSeat().id);
    this.setTimer();
  }

  private setTimer() {
    const ms = (this.armedOffline ? OFFLINE_TURN_MS : TURN_MS) * this.ctx.speed;
    this.cancelTimer?.();
    this.deadline = this.ctx.scheduler.now() + ms;
    this.cancelTimer = this.ctx.scheduler.after(ms, () => {
      this.autoPlay();
      this.ctx.onChange();
    });
  }

  private advance(steps: number) {
    this.current = this.nextActive(this.current, steps);
    this.armTurn();
  }

  /** Se acabó el tiempo (o el jugador está desconectado): roba una carta y pasa. */
  private autoPlay() {
    const seat = this.currentSeat();
    if (this.drawnCardId === null) {
      this.giveCards(seat, 1);
      this.push({ userId: seat.id, kind: 'timeout', count: 1 });
    }
    this.advance(1);
  }

  // ---------- acciones ----------
  action(userId: string, a: GameAction) {
    if (this.phase === 'ended') throw new DomainError('La partida terminó');
    const seat = this.seatOf(userId);
    if (!seat || !this.isActive(seat)) throw new DomainError('No estás en la partida');
    if (this.currentSeat().id !== userId) throw new DomainError('No es tu turno');

    switch (a.type) {
      case 'play':
        return this.playCard(seat, a);
      case 'draw':
        return this.drawOne(seat);
      case 'pass':
        if (this.drawnCardId === null) throw new DomainError('Primero debes robar');
        return this.advance(1);
      default:
        throw new DomainError('Acción desconocida');
    }
  }

  private drawOne(seat: Seat) {
    if (this.drawnCardId !== null) throw new DomainError('Ya robaste: juega esa carta o pasa');
    const [card] = this.giveCards(seat, 1);
    this.push({ userId: seat.id, kind: 'draw', count: card ? 1 : 0 });
    if (card && isPlayable(card, this.top, this.currentColor)) {
      this.drawnCardId = card.id;
      this.setTimer();
    } else {
      this.advance(1);
    }
  }

  private playCard(seat: Seat, a: GameAction) {
    const cardId = Number(a.cardId);
    if (this.drawnCardId !== null && cardId !== this.drawnCardId)
      throw new DomainError('Solo puedes jugar la carta que robaste');
    const card = seat.hand.find((c) => c.id === cardId);
    if (!card) throw new DomainError('No tienes esa carta');
    if (!isPlayable(card, this.top, this.currentColor)) throw new DomainError('Esa carta no se puede jugar');

    let chosen: UnoColor | null = null;
    if (card.color === 'wild') {
      if (!COLORS.includes(a.color as UnoColor)) throw new DomainError('Elige un color');
      chosen = a.color as UnoColor;
    }

    seat.hand = seat.hand.filter((c) => c.id !== card.id);
    this.discard.push(card);
    this.currentColor = chosen ?? (card.color as UnoColor);
    this.drawnCardId = null;
    this.push({ userId: seat.id, kind: 'play', card, ...(chosen ? { color: chosen } : {}) });

    // Quedarse con una carta sin decir UNO cuesta 2 cartas.
    if (seat.hand.length === 1 && a.uno !== true) {
      this.giveCards(seat, 2);
      this.push({ userId: seat.id, kind: 'unoPenalty', count: 2 });
    }
    if (seat.hand.length === 0) {
      seat.out = true;
      this.finishedOrder.push(seat.id);
      this.push({ userId: seat.id, kind: 'finished', place: this.finishedOrder.length });
    }

    const active = this.activeSeats().length;
    if (active <= 1) return this.finishGame();

    let steps = 1;
    let penalty = 0;
    if (card.value === 'skip') steps = 2;
    if (card.value === 'reverse') {
      this.dir = this.dir === 1 ? -1 : 1;
      if (active === 2 && !seat.out) steps = 2; // con 2 jugadores, reversa = salta turno
    }
    if (card.value === 'draw2') penalty = 2;
    if (card.value === 'wild4') penalty = 4;
    if (penalty > 0) {
      const victim = this.seats[this.nextActive(this.current, 1)] as Seat;
      const drawn = this.giveCards(victim, penalty);
      this.push({ userId: victim.id, kind: 'draw', count: drawn.length });
      steps = 2;
    }
    this.advance(steps);
  }

  // ---------- presencia ----------
  presenceChanged() {
    if (this.phase !== 'playing') return;
    const offline = !this.ctx.isOnline(this.currentSeat().id);
    if (offline !== this.armedOffline) {
      this.armedOffline = offline;
      this.setTimer();
    }
  }

  playerLeft(userId: string) {
    const seat = this.seatOf(userId);
    if (!seat || seat.left || this.phase === 'ended') return;
    const wasActive = this.isActive(seat);
    seat.left = true;
    if (!wasActive) return; // ya había terminado: su posición no cambia
    this.leftOrder.push(seat.id);
    this.drawPile = this.shuffle([...this.drawPile, ...seat.hand]);
    seat.hand = [];
    if (this.activeSeats().length <= 1) return this.finishGame();
    if (this.currentSeat().id === userId) this.advance(1);
  }

  private finishGame() {
    if (this.phase === 'ended') return;
    this.destroy();
    this.phase = 'ended';
    this.deadline = 0;
    const order = [
      ...this.finishedOrder,
      ...this.activeSeats().map((s) => s.id),
      ...[...this.leftOrder].reverse(), // quien se fue antes queda más abajo
    ];
    const total = order.length;
    this.results = order.map((userId, i) => ({ userId, place: i + 1, points: pointsForPlace(i + 1, total) }));
    this.ctx.onFinished({ results: order.map((userId, i) => ({ userId, place: i + 1, extraStats: [] })) });
  }

  // ---------- vista por jugador ----------
  view(userId: string) {
    const me = this.seatOf(userId);
    const myTurn = this.phase === 'playing' && this.currentSeat().id === userId && !!me && this.isActive(me);
    const playable = !myTurn || !me
      ? []
      : me.hand
          .filter((c) => (this.drawnCardId === null || c.id === this.drawnCardId) && isPlayable(c, this.top, this.currentColor))
          .map((c) => c.id);
    return {
      type: 'uno' as const,
      phase: this.phase,
      deadline: this.deadline,
      now: this.ctx.scheduler.now(),
      players: this.seats.map((s) => {
        const place = this.finishedOrder.indexOf(s.id) + 1;
        return {
          id: s.id,
          username: s.username,
          cards: s.hand.length,
          place: place > 0 ? place : null,
          left: s.left,
          connected: this.ctx.isOnline(s.id),
        };
      }),
      myHand: me?.hand ?? [],
      playable,
      top: this.discard.length ? this.top : null,
      currentColor: this.currentColor,
      turnId: this.phase === 'playing' ? this.currentSeat().id : null,
      direction: this.dir,
      drawCount: this.drawPile.length,
      canDraw: myTurn && this.drawnCardId === null,
      canPass: myTurn && this.drawnCardId !== null,
      log: this.log,
      results: this.results,
    };
  }
}
