import type { GameAction, GameMatch, MatchContext } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import { DomainError, type Player } from '../shared.js';

export type AmongPhase = 'playing' | 'meeting' | 'result' | 'ended';

// ---------- mapa: una oficina abierta con 6 salas y pasillos libres ----------
export const WORLD = { width: 120, height: 72 };
export const ROOMS = [
  { id: 'cafeteria', x: 4, y: 4, w: 34, h: 28 },
  { id: 'office', x: 43, y: 4, w: 34, h: 28 },
  { id: 'servers', x: 82, y: 4, w: 34, h: 28 },
  { id: 'storage', x: 4, y: 40, w: 34, h: 28 },
  { id: 'meeting', x: 43, y: 40, w: 34, h: 28 },
  { id: 'kitchen', x: 82, y: 40, w: 34, h: 28 },
] as const;
const station = (r: (typeof ROOMS)[number]) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---------- reglas ----------
const TICK_MS = 100;
const SPEED = 20; // unidades por segundo
const VISION = 32; // radio de visión de quien sigue vivo
const TASK_RANGE = 7;
const KILL_RANGE = 10;
const REPORT_RANGE = 12;
const TASKS_PER_CREW = 3;
const TASK_MS = 2_500;
const FIRST_KILL_MS = 10_000;
const KILL_COOLDOWN_MS = 20_000;
const MEETING_MS = 40_000;
const RESULT_MS = 5_000;

interface Seat extends Player {
  role: 'crew' | 'impostor';
  x: number;
  y: number;
  dx: number;
  dy: number;
  alive: boolean;
  left: boolean;
  tasks: { id: string; done: boolean }[];
  working: { taskId: string; endsAt: number } | null;
  vote: string | null | undefined; // undefined = no ha votado, null = saltó
  killReadyAt: number;
}

interface Body {
  id: string;
  x: number;
  y: number;
}

interface MeetingResult {
  ejected: string | null;
  wasImpostor: boolean;
  tally: Record<string, number>;
  skips: number;
  votes: { from: string; to: string | null }[];
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toAxis = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, -1, 1) : 0);

/**
 * Among Us "lite" en tiempo real. Todos se mueven a la vez por una oficina de 6 salas.
 * - Tripulantes: hacen tareas (mantener la acción 2,5 s junto a la estación). Ganan al completarlas todas
 *   o al echar a todos los impostores.
 * - Impostores: eliminan tripulantes cercanos (con enfriamiento). Ganan cuando igualan en número a la tripulación.
 * - Quien encuentra un cuerpo lo reporta: reunión con votación (el chat de la sala sirve para discutir).
 * - Quien muere se vuelve fantasma: sigue haciendo tareas y ve todo, pero los vivos no lo ven.
 */
export class AmongUsGame implements GameMatch {
  phase: AmongPhase = 'playing';
  private seats: Seat[];
  private bodies: Body[] = [];
  private meetingResult: MeetingResult | null = null;
  private winner: 'crew' | 'impostor' | null = null;
  private results: { userId: string; place: number; points: number }[] | null = null;
  private deadline = 0;
  private timerCancel: (() => void) | null = null;
  private tickCancel: (() => void) | null = null;
  private ticks = 0;
  private rand: () => number;

  constructor(
    players: Player[],
    private ctx: MatchContext,
  ) {
    this.rand = ctx.random ?? Math.random;
    this.seats = players.map((p) => ({
      ...p,
      role: 'crew',
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      alive: true,
      left: false,
      tasks: [],
      working: null,
      vote: undefined,
      killReadyAt: 0,
    }));
  }

  // ---------- utilidades ----------
  private seatOf(id: string) {
    return this.seats.find((s) => s.id === id);
  }
  private shuffle<T>(items: T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  }
  private now() {
    return this.ctx.scheduler.now();
  }
  private aliveSeats() {
    return this.seats.filter((s) => s.alive);
  }

  private spawn() {
    const cx = (ROOMS[0].x + ROOMS[0].w / 2) | 0;
    const cy = (ROOMS[0].y + ROOMS[0].h / 2) | 0;
    this.seats.forEach((s, i) => {
      const a = (2 * Math.PI * i) / this.seats.length;
      s.x = cx + 9 * Math.cos(a);
      s.y = cy + 8 * Math.sin(a);
      s.dx = 0;
      s.dy = 0;
      s.working = null;
    });
  }

  // ---------- ciclo de vida ----------
  start() {
    const impostors = this.seats.length >= 8 ? 2 : 1;
    this.shuffle(this.seats).slice(0, impostors).forEach((s) => (s.role = 'impostor'));
    for (const s of this.seats) {
      if (s.role === 'crew') {
        s.tasks = this.shuffle([...ROOMS]).slice(0, TASKS_PER_CREW).map((r) => ({ id: r.id, done: false }));
      } else {
        s.killReadyAt = this.now() + FIRST_KILL_MS * this.ctx.speed;
      }
    }
    this.spawn();
    this.loop();
  }

  destroy() {
    this.timerCancel?.();
    this.tickCancel?.();
    this.timerCancel = null;
    this.tickCancel = null;
  }

  isFinished() {
    return this.phase === 'ended';
  }

  private setTimer(ms: number, fn: () => void) {
    this.timerCancel?.();
    this.deadline = this.now() + ms;
    this.timerCancel = this.ctx.scheduler.after(ms, () => {
      fn();
      this.ctx.onChange();
    });
  }

  private loop() {
    this.tickCancel = this.ctx.scheduler.after(TICK_MS, () => {
      this.tick();
      if (this.phase !== 'ended') this.loop();
    });
  }

  private tick() {
    if (this.phase !== 'playing') return;
    const dt = TICK_MS / 1000;
    let changed = ++this.ticks % 10 === 0; // cada segundo refresca enfriamientos y botones aunque nadie se mueva
    for (const s of this.seats) {
      if (s.left) continue;
      if (s.dx !== 0 || s.dy !== 0) {
        const len = Math.hypot(s.dx, s.dy) || 1;
        const k = Math.min(1, 1 / len);
        s.x = clamp(s.x + s.dx * k * SPEED * dt, 0, WORLD.width);
        s.y = clamp(s.y + s.dy * k * SPEED * dt, 0, WORLD.height);
        if (s.working) s.working = null; // moverse cancela la tarea
        changed = true;
      }
      if (s.working) {
        changed = true;
        if (this.now() >= s.working.endsAt) {
          const task = s.tasks.find((t) => t.id === s.working?.taskId);
          if (task) task.done = true;
          s.working = null;
          if (this.checkWin()) return this.ctx.onChange();
        }
      }
    }
    if (changed) this.ctx.onChange();
  }

  // ---------- acciones ----------
  action(userId: string, a: GameAction) {
    const seat = this.seatOf(userId);
    if (!seat || seat.left) throw new DomainError('No estás en la partida');
    const raw = a as GameAction & { dx?: unknown; dy?: unknown };

    if (a.type === 'move') {
      if (this.phase !== 'playing') return;
      seat.dx = toAxis(raw.dx);
      seat.dy = toAxis(raw.dy);
      return;
    }
    if (a.type === 'vote') return this.castVote(seat, a.target);
    if (this.phase !== 'playing') throw new DomainError('Ahora no se puede');

    if (a.type === 'task') {
      if (seat.role !== 'crew') throw new DomainError('Los impostores no hacen tareas');
      const task = this.nearbyTask(seat);
      if (!task) throw new DomainError('Acércate a una estación de tarea pendiente');
      seat.working = { taskId: task.id, endsAt: this.now() + TASK_MS * this.ctx.speed };
      return;
    }
    if (a.type === 'kill') return this.kill(seat);
    if (a.type === 'report') {
      if (!seat.alive) throw new DomainError('Los fantasmas no reportan');
      if (!this.bodyNear(seat)) throw new DomainError('No hay ningún cuerpo cerca');
      return this.startMeeting();
    }
    throw new DomainError('Acción desconocida');
  }

  private nearbyTask(seat: Seat) {
    return seat.tasks.find((t) => {
      if (t.done) return false;
      const room = ROOMS.find((r) => r.id === t.id);
      return room ? dist(seat, station(room)) <= TASK_RANGE : false;
    });
  }

  private bodyNear(seat: Seat) {
    return this.bodies.find((b) => dist(seat, b) <= REPORT_RANGE);
  }

  private killTarget(seat: Seat) {
    if (seat.role !== 'impostor' || !seat.alive || this.now() < seat.killReadyAt) return undefined;
    return this.seats
      .filter((s) => s.alive && s.role === 'crew' && dist(seat, s) <= KILL_RANGE)
      .sort((a, b) => dist(seat, a) - dist(seat, b))[0];
  }

  private kill(seat: Seat) {
    if (seat.role !== 'impostor' || !seat.alive) throw new DomainError('Solo los impostores eliminan');
    if (this.now() < seat.killReadyAt) throw new DomainError('Aún se está enfriando');
    const victim = this.killTarget(seat);
    if (!victim) throw new DomainError('No hay nadie al alcance');
    victim.alive = false;
    victim.working = null;
    victim.dx = victim.dy = 0;
    this.bodies.push({ id: victim.id, x: victim.x, y: victim.y });
    seat.x = victim.x;
    seat.y = victim.y;
    seat.killReadyAt = this.now() + KILL_COOLDOWN_MS * this.ctx.speed;
    this.checkWin();
  }

  // ---------- reunión ----------
  private startMeeting() {
    this.phase = 'meeting';
    this.bodies = [];
    this.meetingResult = null;
    for (const s of this.seats) s.vote = undefined;
    this.spawn();
    this.setTimer(MEETING_MS * this.ctx.speed, () => this.closeMeeting());
  }

  private castVote(seat: Seat, target: unknown) {
    if (this.phase !== 'meeting') throw new DomainError('No hay una reunión en curso');
    if (!seat.alive) throw new DomainError('Los fantasmas no votan');
    if (seat.vote !== undefined) throw new DomainError('Ya votaste');
    if (target === null || target === undefined || target === 'skip') seat.vote = null;
    else {
      const t = this.seatOf(String(target));
      if (!t || !t.alive) throw new DomainError('Voto inválido');
      seat.vote = t.id;
    }
    if (this.aliveSeats().every((s) => s.vote !== undefined)) this.closeMeeting();
  }

  private closeMeeting() {
    if (this.phase !== 'meeting') return;
    const voters = this.aliveSeats();
    const tally: Record<string, number> = {};
    let skips = 0;
    for (const v of voters) {
      if (v.vote === undefined || v.vote === null) skips++;
      else tally[v.vote] = (tally[v.vote] ?? 0) + 1;
    }
    const top = Math.max(0, ...Object.values(tally));
    const leaders = Object.keys(tally).filter((id) => tally[id] === top);
    let ejected: Seat | undefined;
    if (leaders.length === 1 && top > skips) ejected = this.seatOf(leaders[0] as string);
    if (ejected) ejected.alive = false;
    this.meetingResult = {
      ejected: ejected?.id ?? null,
      wasImpostor: ejected?.role === 'impostor',
      tally,
      skips,
      votes: voters.map((v) => ({ from: v.id, to: v.vote ?? null })),
    };
    this.phase = 'result';
    if (this.checkWin()) return;
    this.setTimer(RESULT_MS * this.ctx.speed, () => {
      this.phase = 'playing';
      this.deadline = 0;
      this.meetingResult = null;
      for (const s of this.seats) if (s.role === 'impostor') s.killReadyAt = this.now() + KILL_COOLDOWN_MS * this.ctx.speed;
    });
  }

  // ---------- presencia ----------
  presenceChanged() {
    for (const s of this.seats) if (!this.ctx.isOnline(s.id)) s.dx = s.dy = 0;
  }

  playerLeft(userId: string) {
    const seat = this.seatOf(userId);
    if (!seat || seat.left || this.phase === 'ended') return;
    seat.left = true;
    seat.alive = false;
    seat.working = null;
    seat.dx = seat.dy = 0;
    if (this.checkWin()) return;
    if (this.phase === 'meeting' && this.aliveSeats().every((s) => s.vote !== undefined)) this.closeMeeting();
  }

  // ---------- final ----------
  /** Devuelve true si la partida terminó. */
  private checkWin(): boolean {
    if (this.phase === 'ended') return true;
    const impostors = this.seats.filter((s) => s.role === 'impostor' && s.alive).length;
    const crew = this.seats.filter((s) => s.role === 'crew' && s.alive).length;
    const tasks = this.seats.filter((s) => s.role === 'crew' && !s.left).flatMap((s) => s.tasks);
    if (impostors === 0) this.finish('crew');
    else if (impostors >= crew) this.finish('impostor');
    else if (tasks.length > 0 && tasks.every((t) => t.done)) this.finish('crew');
    return (this.phase as AmongPhase) === 'ended';
  }

  private finish(winner: 'crew' | 'impostor') {
    this.destroy();
    this.phase = 'ended';
    this.winner = winner;
    this.deadline = 0;
    this.bodies = [];
    for (const s of this.seats) s.dx = s.dy = 0;
    const total = this.seats.length;
    const winners = this.seats.filter((s) => s.role === winner && !s.left).length;
    const placeOf = (s: Seat) => (s.left ? total : s.role === winner ? 1 : winners + 1);
    this.results = this.seats
      .map((s) => ({ userId: s.id, place: placeOf(s) }))
      .sort((a, b) => a.place - b.place)
      .map((r) => ({ ...r, points: pointsForPlace(r.place, total) }));
    this.ctx.onFinished({
      results: this.seats.map((s) => ({
        userId: s.id,
        place: placeOf(s),
        extraStats: [`${s.role}_played`, ...(s.role === winner && !s.left ? [`${s.role}_wins`] : [])],
      })),
    });
  }

  // ---------- vista ----------
  view(userId: string) {
    const me = this.seatOf(userId);
    const playing = this.phase === 'playing';
    const sees = (o: Seat | Body) => !playing || !me || !me.alive || o === me || dist(me, o) <= VISION;
    const crewTasks = this.seats.filter((s) => s.role === 'crew' && !s.left).flatMap((s) => s.tasks);
    const meView = me && {
      role: me.role,
      alive: me.alive,
      x: me.x,
      y: me.y,
      tasks: me.tasks.map((t) => {
        const room = ROOMS.find((r) => r.id === t.id) as (typeof ROOMS)[number];
        return { id: t.id, done: t.done, ...station(room) };
      }),
      working: me.working ? Math.min(1, 1 - (me.working.endsAt - this.now()) / (TASK_MS * this.ctx.speed)) : null,
      canTask: me.role === 'crew' && playing && !me.working && Boolean(this.nearbyTask(me)),
      canKill: playing && Boolean(this.killTarget(me)),
      canReport: playing && me.alive && Boolean(this.bodyNear(me)),
      killIn: me.role === 'impostor' && me.alive ? Math.max(0, me.killReadyAt - this.now()) : 0,
    };
    const reveal = this.phase === 'ended' || me?.role === 'impostor';
    return {
      type: 'amongus' as const,
      phase: this.phase,
      deadline: this.deadline,
      now: this.now(),
      map: { ...WORLD, rooms: ROOMS, vision: VISION, taskRange: TASK_RANGE },
      me: meView ?? null,
      role: me ? me.role : ('spectator' as const),
      players: this.seats
        .filter((s) => !s.left)
        .filter((s) => (playing ? sees(s) && (s.alive || !me || !me.alive) : true))
        .map((s) => ({
          id: s.id,
          username: s.username,
          x: s.x,
          y: s.y,
          alive: s.alive,
          connected: this.ctx.isOnline(s.id),
          voted: s.vote !== undefined,
          working: Boolean(s.working),
          impostor: reveal && s.role === 'impostor' ? true : undefined,
        })),
      bodies: playing ? this.bodies.filter(sees) : [],
      tasksDone: crewTasks.filter((t) => t.done).length,
      tasksTotal: crewTasks.length,
      myVote: me?.vote,
      meeting: this.phase === 'meeting' || this.phase === 'result' ? this.meetingResult : null,
      winner: this.winner,
      results: this.results,
    };
  }
}
