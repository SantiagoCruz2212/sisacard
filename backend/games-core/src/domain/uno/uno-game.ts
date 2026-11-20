import type { GameAction, GameMatch, MatchContext } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import { DomainError, type Player } from '../shared.js';
import {
  buildClassicDeck,
  buildFlipDeck,
  buildInfinityDeck,
  CHALLENGEABLE,
  colorsOf,
  DICE_SIDES,
  DRAW_AMOUNT,
  faceOf,
  isDigit,
  isUnoDigit,
  matches,
  type CardFace,
  type UnoCard,
  type UnoColor,
  type UnoDigit,
  type UnoSide,
  type UnoValue,
} from './uno-cards.js';
import { defaultUnoSettings, type UnoSettings } from './uno-settings.js';

export { buildClassicDeck as buildDeck, COLORS } from './uno-cards.js';
export type { UnoCard, UnoColor, UnoValue } from './uno-cards.js';
export type UnoPhase = 'playing' | 'ended';

const HAND_SIZE = 7;
const TURN_MS = 30_000;
const OFFLINE_TURN_MS = 1_500;
const REVEAL_MS = 10_000;
const LOG_SIZE = 10;

interface Seat extends Player {
  hand: UnoCard[];
  out: boolean; // se quedó sin cartas (terminó)
  left: boolean; // abandonó la partida
}

interface LogEntry {
  /** Creciente: el cliente lo usa para animar cada jugada una sola vez (p. ej. el dado). */
  id: number;
  userId: string;
  kind:
    | 'play'
    | 'draw'
    | 'unoPenalty'
    | 'finished'
    | 'timeout'
    | 'challenge'
    | 'caught'
    | 'saidUno'
    | 'swap'
    | 'rotate'
    | 'flip'
    | 'dice'
    | 'discard'
    | 'eye'
    | 'jumpIn';
  card?: CardFace;
  color?: UnoColor;
  number?: UnoDigit;
  count?: number;
  place?: number;
  targetId?: string;
  roll?: number;
  success?: boolean;
}

/** Robo acumulado (apilar o comodín desafiable): lo paga quien tiene el turno si no responde. */
interface Stack {
  amount: number;
  /** Lo que sumó la última carta: para apilar hay que igualarlo o superarlo. */
  last: number;
  fromId: string;
  /** null = no se puede desafiar; si no, si la última carta se jugó de forma ilegal. */
  illegal: boolean | null;
}

/** Algo que el jugador del turno debe resolver antes de que el turno avance. */
type Pending = { kind: 'discard'; count: number; steps: number; uno: boolean } | { kind: 'color'; steps: number };

/**
 * UNO con reglas de la casa opcionales (apilar, desafío, 7-0, jump-in, atrapar el UNO) y tres barajas:
 * clásica, Infinity (cartas extra) y Flip (cartas de dos caras). Se juega hasta que queda un solo
 * jugador: el orden en que se quedan sin cartas es el ranking.
 */
export class UnoGame implements GameMatch {
  phase: UnoPhase = 'playing';
  private seats: Seat[];
  private drawPile: UnoCard[] = [];
  private discard: UnoCard[] = [];
  private side: UnoSide = 'light';
  private currentColor: UnoColor = 'red';
  /** Valor con el que hay que emparejar (el número elegido con #; el comodín sin efecto no lo cambia). */
  private currentValue: UnoValue = '0';
  private dir: 1 | -1 = 1;
  private current = 0;
  private drawnCardId: number | null = null;
  private stack: Stack | null = null;
  private pending: Pending | null = null;
  /** Quienes se quedaron con 1 carta sin decir UNO (regla de atrapar). */
  private vulnerable = new Set<string>();
  private reveals = new Map<string, { targetId: string; cards: CardFace[]; until: number }>();
  private finishedOrder: string[] = [];
  private leftOrder: string[] = [];
  private log: LogEntry[] = [];
  private logSeq = 0;
  private results: { userId: string; place: number; points: number }[] | null = null;
  private deadline = 0;
  private cancelTimer: (() => void) | null = null;
  private armedOffline = false;
  private rand: () => number;

  constructor(
    players: Player[],
    private ctx: MatchContext,
    private settings: UnoSettings = defaultUnoSettings(),
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
  private face(card: UnoCard): CardFace {
    return faceOf(card, this.side);
  }
  private otherFace(card: UnoCard): CardFace {
    return faceOf(card, this.side === 'light' ? 'dark' : 'light');
  }
  private seatOf(id: unknown) {
    return this.seats.find((s) => s.id === id);
  }
  private isActive = (s: Seat) => !s.out && !s.left;
  private activeSeats() {
    return this.seats.filter(this.isActive);
  }
  private currentSeat() {
    return this.seats[this.current] as Seat;
  }
  private push(entry: Omit<LogEntry, 'id'>) {
    this.log = [...this.log, { id: ++this.logSeq, ...entry }].slice(-LOG_SIZE);
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
  private nextSeat() {
    return this.seats[this.nextActive(this.current, 1)] as Seat;
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

  /** Hace robar a alguien y lo deja en el registro. */
  private penalize(seat: Seat, count: number) {
    const drawn = this.giveCards(seat, count);
    this.push({ userId: seat.id, kind: 'draw', count: drawn.length });
  }

  // ---------- ciclo de vida ----------
  start() {
    const deck = this.settings.flip
      ? buildFlipDeck((a) => this.shuffle(a), this.settings.infinity)
      : this.settings.infinity
        ? buildInfinityDeck()
        : buildClassicDeck();
    this.drawPile = this.shuffle(deck);
    for (const seat of this.seats) this.giveCards(seat, HAND_SIZE);
    // La primera carta de la mesa es siempre numérica.
    const skipped: UnoCard[] = [];
    let first = this.drawPile.pop() as UnoCard;
    while (!isDigit(this.face(first).value)) {
      skipped.push(first);
      first = this.drawPile.pop() as UnoCard;
    }
    this.drawPile = [...skipped, ...this.drawPile];
    this.discard = [first];
    this.currentColor = this.face(first).color as UnoColor;
    this.currentValue = this.face(first).value;
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
    this.pending = null;
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
      this.pruneVulnerable();
      this.ctx.onChange();
    });
  }

  private advance(steps: number) {
    this.current = this.nextActive(this.current, steps);
    this.armTurn();
  }

  /** Se acabó el tiempo (o el jugador está desconectado): se resuelve lo pendiente o roba y pasa. */
  private autoPlay() {
    const seat = this.currentSeat();
    if (this.pending?.kind === 'discard') {
      return this.discardCards(seat, seat.hand.slice(0, this.pending.count).map((c) => c.id), true);
    }
    if (this.pending?.kind === 'color') {
      const colors = colorsOf(this.side);
      return this.applyFlipColor(colors[Math.floor(this.rand() * colors.length)] as UnoColor);
    }
    this.push({ userId: seat.id, kind: 'timeout' });
    if (this.stack) return this.takeStack(seat);
    if (this.drawnCardId === null) this.giveCards(seat, 1);
    this.advance(1);
  }

  // ---------- reglas de jugar ----------
  /** ¿Puede este jugador soltar esta carta ahora mismo (en su turno o fuera de él)? */
  private canPlayNow(seat: Seat, card: UnoCard): boolean {
    if (this.phase !== 'playing' || !this.isActive(seat)) return false;
    if (this.currentSeat() !== seat) return this.canPlayOutOfTurn(card);
    if (this.pending) return false;
    const face = this.face(card);
    if (this.stack) return this.canStack(face);
    if (this.drawnCardId !== null && card.id !== this.drawnCardId) return false;
    return matches(face, this.currentValue, this.currentColor);
  }

  private canStack(face: CardFace) {
    return !!this.stack && this.settings.stacking && (DRAW_AMOUNT[face.value] ?? 0) >= this.stack.last;
  }

  private canPlayOutOfTurn(card: UnoCard): boolean {
    const face = this.face(card);
    if (face.value === 'joker') return true;
    if (!this.settings.jumpIn || this.stack || this.pending) return false;
    const top = this.face(this.top);
    return face.color === top.color && face.value === top.value;
  }

  // ---------- acciones ----------
  action(userId: string, a: GameAction) {
    this.dispatch(userId, a);
    this.pruneVulnerable();
  }

  private dispatch(userId: string, a: GameAction) {
    if (this.phase === 'ended') throw new DomainError('La partida terminó');
    const seat = this.seatOf(userId);
    if (!seat || seat.left) throw new DomainError('No estás en la partida');
    if (a.type === 'catch') return this.catchUno(seat, a.target);
    if (!this.isActive(seat)) throw new DomainError('No estás en la partida');
    if (a.type === 'uno') return this.declareUno(seat);
    const myTurn = this.currentSeat().id === userId;
    if (a.type === 'play') return myTurn ? this.playCard(seat, a) : this.playOutOfTurn(seat, a);
    if (!myTurn) throw new DomainError('No es tu turno');

    switch (a.type) {
      case 'draw':
        return this.drawOne(seat);
      case 'pass':
        if (this.pending || this.stack) throw new DomainError('Primero termina tu jugada');
        if (this.drawnCardId === null) throw new DomainError('Primero debes robar');
        return this.advance(1);
      case 'challenge':
        return this.challenge(seat);
      case 'discard':
        return this.discardChosen(seat, a);
      case 'color':
        if (this.pending?.kind !== 'color') throw new DomainError('No tienes que elegir color');
        if (!colorsOf(this.side).includes(a.color as UnoColor)) throw new DomainError('Elige un color');
        return this.applyFlipColor(a.color as UnoColor);
      default:
        throw new DomainError('Acción desconocida');
    }
  }

  private drawOne(seat: Seat) {
    if (this.pending) throw new DomainError('Primero termina tu jugada');
    if (this.stack) return this.takeStack(seat);
    if (this.drawnCardId !== null) throw new DomainError('Ya robaste: juega esa carta o pasa');
    this.closeCatchWindow(seat);
    const [card] = this.giveCards(seat, 1);
    this.push({ userId: seat.id, kind: 'draw', count: card ? 1 : 0 });
    if (card && matches(this.face(card), this.currentValue, this.currentColor)) {
      this.drawnCardId = card.id;
      this.setTimer();
    } else {
      this.advance(1);
    }
  }

  /** Paga el robo acumulado y pierde el turno. */
  private takeStack(seat: Seat, extra = 0) {
    const amount = (this.stack?.amount ?? 0) + extra;
    this.stack = null;
    this.closeCatchWindow(seat);
    this.penalize(seat, amount);
    this.advance(1);
  }

  private challenge(seat: Seat) {
    if (!this.stack || this.stack.illegal === null) throw new DomainError('No hay nada que desafiar');
    const { illegal, fromId, amount } = this.stack;
    this.push({ userId: seat.id, kind: 'challenge', targetId: fromId, success: illegal });
    if (!illegal) return this.takeStack(seat, 2);
    // Desafío ganado: quien jugó el comodín roba todo y el desafiante juega normal.
    this.stack = null;
    const offender = this.seatOf(fromId);
    if (offender && this.isActive(offender)) this.penalize(offender, amount);
    this.armTurn();
  }

  private playCard(seat: Seat, a: GameAction) {
    const card = seat.hand.find((c) => c.id === Number(a.cardId));
    if (!card) throw new DomainError('No tienes esa carta');
    if (this.pending) throw new DomainError('Primero termina tu jugada');
    if (this.drawnCardId !== null && card.id !== this.drawnCardId)
      throw new DomainError('Solo puedes jugar la carta que robaste');
    const face = this.face(card);
    if (this.stack) {
      if (!this.canStack(face)) throw new DomainError('Roba o responde con otro + igual o mayor');
    } else if (!matches(face, this.currentValue, this.currentColor)) {
      throw new DomainError('Esa carta no se puede jugar');
    }
    this.resolvePlay(seat, card, a, 'turn');
  }

  /** Fuera de turno: el comodín sin efecto, o una carta idéntica a la de la mesa (jump-in). */
  private playOutOfTurn(seat: Seat, a: GameAction) {
    const card = seat.hand.find((c) => c.id === Number(a.cardId));
    if (!card || !this.canPlayOutOfTurn(card)) throw new DomainError('No es tu turno');
    this.resolvePlay(seat, card, a, this.face(card).value === 'joker' ? 'free' : 'jumpIn');
  }

  /** Elige al otro jugador de una carta dirigida. Con un solo rival no hace falta elegir. */
  private resolveTarget(seat: Seat, raw: unknown): Seat {
    const others = this.activeSeats().filter((s) => s !== seat);
    const target = others.find((s) => s.id === raw) ?? (others.length === 1 ? others[0] : undefined);
    if (!target) throw new DomainError('Elige a un jugador');
    return target;
  }

  /**
   * Juega una carta ya validada. `turn` = en su turno; `jumpIn` = idéntica fuera de turno (el turno
   * pasa a ser suyo); `free` = comodín sin efecto fuera de turno (el turno no cambia).
   */
  private resolvePlay(seat: Seat, card: UnoCard, a: GameAction, mode: 'turn' | 'jumpIn' | 'free') {
    const face = this.face(card);
    const handAfter = seat.hand.length - 1;

    // Validar todo antes de tocar el estado.
    let chosenColor: UnoColor | null = null;
    if (face.color === 'wild' && face.value !== 'joker') {
      if (!colorsOf(this.side).includes(a.color as UnoColor)) throw new DomainError('Elige un color');
      chosenColor = a.color as UnoColor;
    }
    let chosenNumber: UnoDigit | null = null;
    if (face.value === 'number') {
      if (!isUnoDigit(a.number)) throw new DomainError('Elige un número');
      chosenNumber = a.number;
    }
    const swapsHands = face.value === 'swap' || (face.value === '7' && this.settings.sevenZero);
    const needsTarget = face.value === 'target4' || face.value === 'eye' || (swapsHands && handAfter > 0);
    const target = needsTarget ? this.resolveTarget(seat, a.target) : null;
    const illegal = CHALLENGEABLE.includes(face.value)
      ? seat.hand.some((c) => c.id !== card.id && this.face(c).color === this.currentColor)
      : null;

    if (mode === 'jumpIn') {
      this.push({ userId: seat.id, kind: 'jumpIn' });
      this.current = this.seats.indexOf(seat);
    }
    this.closeCatchWindow(seat);
    seat.hand = seat.hand.filter((c) => c.id !== card.id);
    this.discard.push(card);
    this.drawnCardId = null;
    if (face.value !== 'joker') {
      this.currentColor = chosenColor ?? (face.color as UnoColor);
      this.currentValue = chosenNumber ?? face.value;
    }
    this.push({
      userId: seat.id,
      kind: 'play',
      card: { color: face.color, value: face.value },
      ...(chosenColor ? { color: chosenColor } : {}),
      ...(chosenNumber ? { number: chosenNumber } : {}),
      ...(target ? { targetId: target.id } : {}),
    });

    // /2 y -1: primero se eligen las cartas a descartar; el UNO se revisa al terminar.
    const discardCount =
      face.value === 'half' ? Math.floor(seat.hand.length / 2) : face.value === 'minus1' ? Math.min(1, seat.hand.length) : 0;
    if (discardCount === 0) this.checkUno(seat, a.uno === true);
    if (seat.hand.length === 0) this.markOut(seat);
    if (this.activeSeats().length <= 1) return this.finishGame();

    const steps = this.applyEffect(seat, face, target, illegal);
    if (discardCount > 0) this.pending = { kind: 'discard', count: discardCount, steps, uno: a.uno === true };

    if (mode === 'free') return; // comodín sin efecto fuera de turno: el turno sigue donde estaba
    if (this.pending) return this.setTimer();
    this.advance(steps);
  }

  /** Aplica el efecto de la carta y devuelve cuántos jugadores avanza el turno (0 = vuelve a jugar). */
  private applyEffect(seat: Seat, face: CardFace, target: Seat | null, illegal: boolean | null): number {
    const again = seat.out ? 1 : 0;
    const drawAmount = DRAW_AMOUNT[face.value];
    if (drawAmount) {
      if (this.settings.stacking || (this.settings.challenge && illegal !== null)) {
        this.stack = {
          amount: (this.stack?.amount ?? 0) + drawAmount,
          last: drawAmount,
          fromId: seat.id,
          illegal: this.settings.challenge ? illegal : null,
        };
        return 1;
      }
      this.penalize(this.nextSeat(), drawAmount);
      return 2;
    }
    const dice = DICE_SIDES[face.value];
    if (dice) {
      const roll = 1 + Math.floor(this.rand() * dice);
      this.push({ userId: seat.id, kind: 'dice', roll, count: dice });
      this.penalize(this.nextSeat(), roll);
      return 2;
    }

    switch (face.value) {
      case 'skip':
        return 2;
      case 'reverse':
        this.dir = this.dir === 1 ? -1 : 1;
        return this.activeSeats().length === 2 && !seat.out ? 2 : 1; // con 2 jugadores, reversa = salto
      case 'replay':
      case 'skipAll':
        return again;
      case 'plusAll':
        for (const other of this.activeSeats()) if (other !== seat) this.penalize(other, 4);
        return again;
      case 'target4':
        this.penalize(target as Seat, 4);
        return 1;
      case 'double': {
        const victim = this.nextSeat();
        this.penalize(victim, victim.hand.length);
        return 2;
      }
      case 'wildDrawColor':
        this.drawUntilColor(this.nextSeat(), this.currentColor);
        return 2;
      case 'eye':
        if (target) {
          this.reveals.set(seat.id, {
            targetId: target.id,
            cards: target.hand.map((c) => this.face(c)).map(({ color, value }) => ({ color, value })),
            until: this.ctx.scheduler.now() + REVEAL_MS,
          });
          this.push({ userId: seat.id, kind: 'eye', targetId: target.id });
        }
        return 1;
      case 'swap':
      case '7':
        if (target && !seat.out) {
          [seat.hand, target.hand] = [target.hand, seat.hand];
          this.push({ userId: seat.id, kind: 'swap', targetId: target.id });
        }
        return 1;
      case '0':
        if (this.settings.sevenZero && !seat.out) this.rotateHands(seat);
        return 1;
      case 'rotate':
        if (!seat.out) this.rotateHands(seat);
        return 1;
      case 'flip':
        return this.flipTable(seat);
      default:
        return 1;
    }
  }

  private drawUntilColor(seat: Seat, color: UnoColor) {
    let count = 0;
    for (;;) {
      const card = this.drawFromPile();
      if (!card) break;
      seat.hand.push(card);
      count++;
      if (this.face(card).color === color) break;
    }
    this.push({ userId: seat.id, kind: 'draw', count });
  }

  /** Todas las manos pasan al siguiente jugador en el sentido del juego. */
  private rotateHands(by: Seat) {
    const next = new Map<Seat, UnoCard[]>();
    for (const s of this.activeSeats()) {
      next.set(this.seats[this.nextActive(this.seats.indexOf(s), 1)] as Seat, s.hand);
    }
    for (const [s, hand] of next) s.hand = hand;
    this.push({ userId: by.id, kind: 'rotate' });
  }

  /** UNO Flip: se voltea todo. La carta de arriba muestra su otra cara y el mazo se invierte. */
  private flipTable(seat: Seat): number {
    this.side = this.side === 'light' ? 'dark' : 'light';
    this.drawPile.reverse();
    this.push({ userId: seat.id, kind: 'flip' });
    const top = this.face(this.top);
    this.currentValue = top.value;
    if (top.color !== 'wild') {
      this.currentColor = top.color;
      return 1;
    }
    // Quedó un comodín arriba: quien volteó elige el color (si ya terminó, se sortea).
    const colors = colorsOf(this.side);
    if (seat.out) {
      this.currentColor = colors[Math.floor(this.rand() * colors.length)] as UnoColor;
      return 1;
    }
    this.pending = { kind: 'color', steps: 1 };
    return 1;
  }

  private applyFlipColor(color: UnoColor) {
    const steps = this.pending?.steps ?? 1;
    this.pending = null;
    this.currentColor = color;
    this.push({ userId: this.currentSeat().id, kind: 'flip', color });
    this.advance(steps);
  }

  private discardChosen(seat: Seat, a: GameAction) {
    if (this.pending?.kind !== 'discard') throw new DomainError('No tienes que descartar');
    const ids = Array.isArray(a.cardIds) ? [...new Set(a.cardIds.map(Number))] : [];
    if (ids.length !== this.pending.count || !ids.every((id) => seat.hand.some((c) => c.id === id)))
      throw new DomainError(`Elige ${this.pending.count} carta(s) para descartar`);
    this.discardCards(seat, ids, a.uno === true);
  }

  private discardCards(seat: Seat, ids: number[], uno: boolean) {
    const pending = this.pending;
    if (pending?.kind !== 'discard') return;
    const cards = seat.hand.filter((c) => ids.includes(c.id));
    seat.hand = seat.hand.filter((c) => !ids.includes(c.id));
    this.discard.splice(this.discard.length - 1, 0, ...cards); // quedan debajo de la carta de la mesa
    this.push({ userId: seat.id, kind: 'discard', count: cards.length });
    this.pending = null;
    this.checkUno(seat, pending.uno || uno);
    if (seat.hand.length === 0) this.markOut(seat);
    if (this.activeSeats().length <= 1) return this.finishGame();
    this.advance(pending.steps);
  }

  private markOut(seat: Seat) {
    seat.out = true;
    this.finishedOrder.push(seat.id);
    this.push({ userId: seat.id, kind: 'finished', place: this.finishedOrder.length });
  }

  // ---------- UNO ----------
  /** Quedarse con una carta sin decir UNO: se roba 2 al instante o, con la regla de atrapar, queda expuesto. */
  private checkUno(seat: Seat, declared: boolean) {
    if (seat.hand.length !== 1 || declared) return;
    if (this.settings.catchUno) {
      this.vulnerable.add(seat.id);
      return;
    }
    this.giveCards(seat, 2);
    this.push({ userId: seat.id, kind: 'unoPenalty', count: 2 });
  }

  /** Cuando otro jugador juega o roba, ya no se puede atrapar a nadie. */
  private closeCatchWindow(actor: Seat) {
    for (const id of this.vulnerable) if (id !== actor.id) this.vulnerable.delete(id);
  }

  private pruneVulnerable() {
    for (const id of this.vulnerable) {
      const seat = this.seatOf(id);
      if (!seat || !this.isActive(seat) || seat.hand.length !== 1) this.vulnerable.delete(id);
    }
  }

  private catchUno(seat: Seat, rawTarget: unknown) {
    if (!this.settings.catchUno) throw new DomainError('Esta sala no usa la regla de atrapar');
    const target = this.seatOf(rawTarget);
    if (!target || target === seat || !this.vulnerable.has(target.id) || target.hand.length !== 1)
      throw new DomainError('No hay a quién atrapar');
    this.vulnerable.delete(target.id);
    this.giveCards(target, 2);
    this.push({ userId: seat.id, kind: 'caught', targetId: target.id, count: 2 });
  }

  private declareUno(seat: Seat) {
    if (!this.vulnerable.delete(seat.id)) return;
    this.push({ userId: seat.id, kind: 'saidUno' });
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
    this.vulnerable.delete(seat.id);
    if (!wasActive) return; // ya había terminado: su posición no cambia
    this.leftOrder.push(seat.id);
    this.drawPile = this.shuffle([...this.drawPile, ...seat.hand]);
    seat.hand = [];
    if (this.activeSeats().length <= 1) return this.finishGame();
    if (this.currentSeat().id === userId) {
      this.stack = null;
      this.advance(1);
    }
  }

  private finishGame() {
    if (this.phase === 'ended') return;
    this.destroy();
    this.phase = 'ended';
    this.deadline = 0;
    this.stack = null;
    this.pending = null;
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
    const playing = this.phase === 'playing';
    const myTurn = playing && this.currentSeat().id === userId && !!me && this.isActive(me);
    const flip = this.settings.flip;
    const show = (c: UnoCard) => {
      const f = this.face(c);
      return { id: c.id, color: f.color, value: f.value };
    };
    const back = (c: UnoCard) => {
      const f = this.otherFace(c);
      return { color: f.color, value: f.value };
    };
    const reveal = this.reveals.get(userId);
    const deckTop = this.drawPile[this.drawPile.length - 1];
    return {
      type: 'uno' as const,
      phase: this.phase,
      deadline: this.deadline,
      now: this.ctx.scheduler.now(),
      settings: this.settings,
      side: this.side,
      players: this.seats.map((s) => {
        const place = this.finishedOrder.indexOf(s.id) + 1;
        return {
          id: s.id,
          username: s.username,
          cards: s.hand.length,
          place: place > 0 ? place : null,
          left: s.left,
          connected: this.ctx.isOnline(s.id),
          vulnerable: this.vulnerable.has(s.id),
          // En UNO Flip todos ven la otra cara de las cartas ajenas (como en la mesa real).
          backs: flip && s.id !== userId ? s.hand.map(back) : null,
        };
      }),
      myHand: me?.hand.map(show) ?? [],
      playable: me && playing ? me.hand.filter((c) => this.canPlayNow(me, c)).map((c) => c.id) : [],
      top: this.discard.length ? show(this.top) : null,
      currentColor: this.currentColor,
      currentValue: this.currentValue,
      turnId: playing ? this.currentSeat().id : null,
      direction: this.dir,
      drawCount: this.drawPile.length,
      deckBack: flip && deckTop ? back(deckTop) : null,
      canDraw: myTurn && !this.pending && this.drawnCardId === null,
      canPass: myTurn && !this.pending && !this.stack && this.drawnCardId !== null,
      penalty: this.stack && playing
        ? { amount: this.stack.amount, victimId: this.currentSeat().id, canChallenge: myTurn && this.stack.illegal !== null }
        : null,
      pending: myTurn && this.pending
        ? this.pending.kind === 'discard'
          ? { kind: 'discard' as const, count: this.pending.count }
          : { kind: 'color' as const, count: 0 }
        : null,
      choosingId: playing && this.pending ? this.currentSeat().id : null,
      reveal: reveal && reveal.until > this.ctx.scheduler.now() ? reveal : null,
      log: this.log,
      results: this.results,
    };
  }
}
