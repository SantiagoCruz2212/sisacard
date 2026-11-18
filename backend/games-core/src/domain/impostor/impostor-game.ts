import type { GameMatch } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import { DomainError, type Player, type Scheduler } from '../shared.js';
import { WORDS } from './words.js';

export type Phase = 'reveal' | 'clues' | 'voting' | 'result' | 'guess' | 'ended';
export type Winner = 'crew' | 'impostor';
export type Role = 'crew' | 'impostor';

export interface Timings {
  revealMs: number;
  clueMs: number;
  voteMs: number;
  resultMs: number;
  guessMs: number;
}

export const DEFAULT_TIMINGS: Timings = { revealMs: 10_000, clueMs: 30_000, voteMs: 60_000, resultMs: 9_000, guessMs: 30_000 };

export const scaleTimings = (k: number): Timings => ({
  revealMs: DEFAULT_TIMINGS.revealMs * k,
  clueMs: DEFAULT_TIMINGS.clueMs * k,
  voteMs: DEFAULT_TIMINGS.voteMs * k,
  resultMs: DEFAULT_TIMINGS.resultMs * k,
  guessMs: DEFAULT_TIMINGS.guessMs * k,
});

export interface GameResult {
  winner: Winner;
  players: { userId: string; role: Role; won: boolean; place: number }[];
}

interface Member extends Player {
  out: boolean;
  left: boolean;
}
interface Clue {
  round: number;
  userId: string;
  text: string;
}
interface VoteResult {
  eliminated: string | null;
  wasImpostor: boolean;
  tally: Record<string, number>;
  votes: { from: string; to: string | null }[];
}

export interface ImpostorDeps {
  isOnline: (userId: string) => boolean;
  scheduler: Scheduler;
  timings: Timings;
  /** El estado cambió (por una acción o por un temporizador): hay que notificar a los jugadores. */
  onChange: () => void;
  onFinished: (result: GameResult) => void;
  random?: () => number;
}

const CLUE_PASSES = 2; // pistas que da cada jugador antes de votar

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export class ImpostorGame implements GameMatch {
  phase: Phase = 'reveal';
  private members: Member[];
  private word: string;
  private category: string;
  private impostors = new Set<string>();
  private round = 0;
  private order: string[] = [];
  private turn = -1;
  private clues: Clue[] = [];
  private votes = new Map<string, string | null>();
  private deadline = 0;
  private cancelTimer: (() => void) | null = null;
  private result: VoteResult | null = null;
  private guesserId: string | null = null;
  private guess: { text: string; correct: boolean } | null = null;
  private winner: Winner | null = null;
  private results: { userId: string; place: number; points: number }[] | null = null;
  private rand: () => number;

  constructor(
    players: Player[],
    private deps: ImpostorDeps,
  ) {
    this.rand = deps.random ?? Math.random;
    this.members = players.map((p) => ({ ...p, out: false, left: false }));
    this.category = this.pick(Object.keys(WORDS));
    this.word = this.pick(WORDS[this.category] ?? []);
    const count = players.length >= 7 ? 2 : 1;
    this.shuffle(players)
      .slice(0, count)
      .forEach((p) => this.impostors.add(p.id));
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  }
  private pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rand() * arr.length)] as T;
  }

  // ---------- ciclo de vida ----------
  start() {
    this.phase = 'reveal';
    this.schedule(this.deps.timings.revealMs, () => this.startClues());
  }

  destroy() {
    this.clear();
  }

  isFinished() {
    return this.phase === 'ended';
  }

  private clear() {
    this.cancelTimer?.();
    this.cancelTimer = null;
  }

  private schedule(ms: number, fn: () => void) {
    this.clear();
    this.deadline = this.deps.scheduler.now() + ms;
    this.cancelTimer = this.deps.scheduler.after(ms, () => {
      fn();
      this.deps.onChange();
    });
  }

  private byId(id: string) {
    return this.members.find((m) => m.id === id);
  }
  private alive() {
    return this.members.filter((m) => !m.out);
  }
  private isImpostor = (id: string) => this.impostors.has(id);

  // ---------- pistas ----------
  private startClues() {
    this.round++;
    const ids = this.alive().map((m) => m.id);
    this.order = [];
    for (let i = 0; i < CLUE_PASSES; i++) this.order.push(...this.shuffle(ids));
    this.turn = -1;
    this.phase = 'clues';
    this.nextTurn();
  }

  private nextTurn() {
    this.turn++;
    while (this.turn < this.order.length) {
      const m = this.byId(this.order[this.turn] as string);
      if (m && !m.out && this.deps.isOnline(m.id)) break;
      this.turn++;
    }
    if (this.turn >= this.order.length) return this.startVoting();
    const id = this.order[this.turn] as string;
    this.schedule(this.deps.timings.clueMs, () => {
      this.clues.push({ round: this.round, userId: id, text: '…' });
      this.nextTurn();
    });
  }

  // ---------- votación ----------
  private startVoting() {
    this.phase = 'voting';
    this.votes.clear();
    this.schedule(this.deps.timings.voteMs, () => this.resolveVotes());
  }

  private checkAllVoted() {
    const online = this.alive().filter((m) => this.deps.isOnline(m.id));
    if (online.length > 0 && online.every((m) => this.votes.has(m.id))) this.resolveVotes();
  }

  private resolveVotes() {
    const tally: Record<string, number> = {};
    for (const to of this.votes.values()) if (to !== null) tally[to] = (tally[to] ?? 0) + 1;
    const max = Math.max(0, ...Object.values(tally));
    const top = Object.keys(tally).filter((id) => tally[id] === max);
    const eliminated = max > 0 && top.length === 1 ? (top[0] as string) : null;
    if (eliminated !== null) {
      const m = this.byId(eliminated);
      if (m) m.out = true;
    }
    this.result = {
      eliminated,
      wasImpostor: eliminated !== null && this.isImpostor(eliminated),
      tally,
      votes: [...this.votes.entries()].map(([from, to]) => ({ from, to })),
    };
    this.phase = 'result';
    this.schedule(this.deps.timings.resultMs, () => this.afterResult());
  }

  private afterResult() {
    const alive = this.alive();
    const imp = alive.filter((m) => this.isImpostor(m.id)).length;
    const crew = alive.length - imp;
    if (imp === 0) {
      // Atraparon al último impostor: tiene una última oportunidad adivinando la palabra.
      this.guesserId = this.result?.eliminated ?? null;
      this.phase = 'guess';
      this.schedule(this.deps.timings.guessMs, () => this.finish('crew'));
      return;
    }
    if (imp >= crew) return this.finish('impostor');
    this.startClues();
  }

  // ---------- acciones de jugadores ----------
  action(userId: string, a: { type?: unknown; text?: unknown; target?: unknown }) {
    const member = this.byId(userId);
    if (!member) throw new DomainError('No estás en la partida');

    switch (a.type) {
      case 'clue': {
        if (this.phase !== 'clues' || this.order[this.turn] !== userId) throw new DomainError('No es tu turno');
        const text = String(a.text ?? '').trim().slice(0, 30);
        if (!text) throw new DomainError('Escribe una pista');
        this.clues.push({ round: this.round, userId, text });
        this.nextTurn();
        return;
      }
      case 'vote': {
        if (this.phase !== 'voting' || member.out) throw new DomainError('No puedes votar ahora');
        const target = a.target === null ? null : String(a.target);
        if (target !== null) {
          const t = this.byId(target);
          if (!t || t.out || target === userId) throw new DomainError('Voto inválido');
        }
        this.votes.set(userId, target);
        this.checkAllVoted();
        return;
      }
      case 'guess': {
        if (this.phase !== 'guess' || this.guesserId !== userId) throw new DomainError('No puedes adivinar ahora');
        const text = String(a.text ?? '').trim().slice(0, 40);
        if (!text) throw new DomainError('Escribe tu respuesta');
        const correct = normalize(text) === normalize(this.word);
        this.guess = { text, correct };
        this.finish(correct ? 'impostor' : 'crew');
        return;
      }
      default:
        throw new DomainError('Acción desconocida');
    }
  }

  /** Alguien se conectó o desconectó. */
  presenceChanged() {
    if (this.phase === 'clues') {
      const id = this.order[this.turn];
      if (id !== undefined && !this.deps.isOnline(id)) this.nextTurn();
    } else if (this.phase === 'voting') {
      this.checkAllVoted();
    }
  }

  playerLeft(userId: string) {
    const m = this.byId(userId);
    if (!m || m.out || this.phase === 'ended') return;
    m.out = true;
    m.left = true;
    if (this.phase === 'guess' && this.guesserId === userId) return this.finish('crew');
    if (this.phase === 'clues' || this.phase === 'voting') {
      const alive = this.alive();
      const imp = alive.filter((x) => this.isImpostor(x.id)).length;
      if (imp === 0) return this.finish('crew');
      if (imp >= alive.length - imp) return this.finish('impostor');
      if (this.phase === 'clues' && this.order[this.turn] === userId) this.nextTurn();
      if (this.phase === 'voting') this.checkAllVoted();
    }
  }

  private finish(winner: Winner) {
    if (this.phase === 'ended') return;
    this.clear();
    this.phase = 'ended';
    this.deadline = 0;
    this.winner = winner;
    // Posiciones (con empate): el equipo ganador es 1.º; el perdedor, a continuación.
    const total = this.members.length;
    const wonBy = (id: string) => (winner === 'impostor') === this.isImpostor(id);
    const loserPlace = this.members.filter((m) => wonBy(m.id)).length + 1;
    const players = this.members.map((m) => {
      const role: Role = this.isImpostor(m.id) ? 'impostor' : 'crew';
      const won = wonBy(m.id);
      return { userId: m.id, role, won, place: won ? 1 : loserPlace };
    });
    this.results = players.map((p) => ({ userId: p.userId, place: p.place, points: pointsForPlace(p.place, total) }));
    this.deps.onFinished({ winner, players });
  }

  // ---------- vista por jugador (nunca filtra la palabra al impostor) ----------
  view(userId: string) {
    const isImp = this.isImpostor(userId);
    const isMember = this.members.some((m) => m.id === userId);
    const ended = this.phase === 'ended';
    return {
      type: 'impostor' as const,
      phase: this.phase,
      round: this.round,
      deadline: this.deadline,
      now: this.deps.scheduler.now(),
      category: this.category,
      role: (isMember ? (isImp ? 'impostor' : 'crew') : 'spectator') as Role | 'spectator',
      // Solo los tripulantes conocen la palabra; el espectador y el impostor no la ven hasta el final.
      word: ended || (isMember && !isImp) ? this.word : null,
      players: this.members.map((m) => ({
        id: m.id,
        username: m.username,
        out: m.out,
        left: m.left,
        connected: this.deps.isOnline(m.id),
        voted: this.phase === 'voting' && this.votes.has(m.id),
      })),
      turnId: this.phase === 'clues' ? (this.order[this.turn] ?? null) : null,
      clues: this.clues,
      myVote: this.votes.has(userId) ? this.votes.get(userId) : undefined,
      result: this.phase === 'result' || ended ? this.result : null,
      guesserId: this.phase === 'guess' ? this.guesserId : null,
      guess: ended ? this.guess : null,
      winner: this.winner,
      results: this.results,
      reveal: ended ? { word: this.word, impostors: [...this.impostors] } : null,
    };
  }
}
