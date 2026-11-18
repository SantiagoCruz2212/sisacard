import { describe, expect, it } from 'vitest';
import type { Scheduler } from '../shared.js';
import { DEFAULT_TIMINGS, ImpostorGame, type GameResult } from './impostor-game.js';

class FakeScheduler implements Scheduler {
  time = 0;
  private tasks: { at: number; fn: () => void; cancelled: boolean }[] = [];
  now() {
    return this.time;
  }
  after(ms: number, fn: () => void) {
    const task = { at: this.time + ms, fn, cancelled: false };
    this.tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  }
  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const next = this.tasks.filter((t) => !t.cancelled && t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      this.time = next.at;
      next.cancelled = true;
      next.fn();
    }
    this.time = target;
  }
}

const players = [
  { id: 'a', username: 'Ana' },
  { id: 'b', username: 'Beto' },
  { id: 'c', username: 'Cami' },
];

function setup(online: (id: string) => boolean = () => true) {
  const scheduler = new FakeScheduler();
  let result: GameResult | null = null;
  const game = new ImpostorGame(players, {
    isOnline: online,
    scheduler,
    timings: DEFAULT_TIMINGS,
    onChange: () => {},
    onFinished: (r) => (result = r),
    random: () => 0.3,
  });
  game.start();
  return { game, scheduler, result: () => result };
}

const impostorId = (g: ImpostorGame) => players.find((p) => g.view(p.id).role === 'impostor')!.id;

function playCluesUntilVoting(g: ImpostorGame) {
  while (g.phase === 'clues') {
    const turn = g.view('a').turnId!;
    g.action(turn, { type: 'clue', text: 'pista' });
  }
}

describe('ImpostorGame', () => {
  it('no filtra la palabra al impostor hasta que termina la partida', () => {
    const { game } = setup();
    const imp = impostorId(game);
    expect(game.view(imp).word).toBeNull();
    const crew = players.find((p) => p.id !== imp)!;
    expect(game.view(crew.id).word).toBeTruthy();
  });

  it('si atrapan al impostor y falla al adivinar, gana la tripulación', () => {
    const { game, scheduler, result } = setup();
    const imp = impostorId(game);
    scheduler.advance(DEFAULT_TIMINGS.revealMs);
    expect(game.phase).toBe('clues');
    playCluesUntilVoting(game);
    expect(game.phase).toBe('voting');
    for (const p of players) if (p.id !== imp) game.action(p.id, { type: 'vote', target: imp });
    game.action(imp, { type: 'vote', target: null });
    expect(game.phase).toBe('result');
    scheduler.advance(DEFAULT_TIMINGS.resultMs);
    expect(game.phase).toBe('guess');
    game.action(imp, { type: 'guess', text: 'respuesta-incorrecta' });
    expect(game.phase).toBe('ended');
    expect(result()?.winner).toBe('crew');
    expect(result()?.players.find((p) => p.userId === imp)?.won).toBe(false);
  });

  it('el impostor gana si adivina la palabra tras ser atrapado (ignora tildes y mayúsculas)', () => {
    const { game, scheduler, result } = setup();
    const imp = impostorId(game);
    scheduler.advance(DEFAULT_TIMINGS.revealMs);
    playCluesUntilVoting(game);
    for (const p of players) game.action(p.id, { type: 'vote', target: p.id === imp ? players.find((x) => x.id !== imp)!.id : imp });
    scheduler.advance(DEFAULT_TIMINGS.resultMs);
    const word = game.view(players.find((p) => p.id !== imp)!.id).word!;
    game.action(imp, { type: 'guess', text: word.toUpperCase() });
    expect(result()?.winner).toBe('impostor');
  });

  it('con 3 jugadores, si eliminan a un inocente el impostor gana (1 contra 1)', () => {
    const { game, scheduler, result } = setup();
    const imp = impostorId(game);
    const victim = players.find((p) => p.id !== imp)!.id;
    scheduler.advance(DEFAULT_TIMINGS.revealMs);
    playCluesUntilVoting(game);
    for (const p of players) if (p.id !== victim) game.action(p.id, { type: 'vote', target: victim });
    game.action(victim, { type: 'vote', target: null });
    scheduler.advance(DEFAULT_TIMINGS.resultMs);
    expect(game.phase).toBe('ended');
    expect(result()?.winner).toBe('impostor');
  });

  it('rechaza pistas fuera de turno y votos a uno mismo', () => {
    const { game, scheduler } = setup();
    scheduler.advance(DEFAULT_TIMINGS.revealMs);
    const turn = game.view('a').turnId!;
    const other = players.find((p) => p.id !== turn)!.id;
    expect(() => game.action(other, { type: 'clue', text: 'x' })).toThrow('No es tu turno');
    playCluesUntilVoting(game);
    expect(() => game.action('a', { type: 'vote', target: 'a' })).toThrow('Voto inválido');
  });

  it('salta el turno de quien está desconectado', () => {
    const { game, scheduler } = setup((id) => id !== 'b');
    scheduler.advance(DEFAULT_TIMINGS.revealMs);
    while (game.phase === 'clues') {
      const turn = game.view('a').turnId!;
      expect(turn).not.toBe('b');
      game.action(turn, { type: 'clue', text: 'pista' });
    }
  });

  it('agota el tiempo de pista y sigue avanzando', () => {
    const { game, scheduler } = setup();
    scheduler.advance(DEFAULT_TIMINGS.revealMs);
    scheduler.advance(DEFAULT_TIMINGS.clueMs * 6);
    expect(game.phase).toBe('voting');
  });
});
