import { describe, expect, it } from 'vitest';
import type { GameOutcome } from '../game.js';
import { FakeScheduler } from '../fake-scheduler.js';
import { RouletteGame } from './roulette-game.js';

/**
 * `bullets` = cámara de la bala en cada recarga (la 1.ª es la inicial). Siempre empieza el jugador 'a'.
 * Orden de random(): bala inicial, jugador inicial, y luego una por cada recarga.
 */
function rig(ids: string[], bullets: number[]) {
  const scheduler = new FakeScheduler();
  let outcome: GameOutcome | null = null;
  const values = [(bullets[0] ?? 0) + 0.5, 0, ...bullets.slice(1).map((b) => b + 0.5)].map((v, i) => (i === 1 ? v : v / 6));
  let call = 0;
  const random = () => values[call++] ?? 0;
  const game = new RouletteGame(
    ids.map((id) => ({ id, username: id })),
    { isOnline: () => true, scheduler, speed: 1, onChange: () => {}, onFinished: (o) => (outcome = o), random },
  );
  game.start();
  return { game, scheduler, outcome: () => outcome };
}

const pull = (g: RouletteGame, id: string) => g.action(id, { type: 'pull' });
const view = (g: RouletteGame) => g.view('a');

describe('RouletteGame', () => {
  it('solo puede disparar quien tiene el turno', () => {
    const { game } = rig(['a', 'b'], [3]);
    expect(view(game).turnId).toBe('a');
    expect(() => pull(game, 'b')).toThrow('No es tu turno');
  });

  it('un disparo seguro avanza una cámara y pasa el turno tras la pausa', () => {
    const { game, scheduler } = rig(['a', 'b', 'c'], [5]);
    pull(game, 'a');
    expect(view(game).phase).toBe('between');
    expect(view(game).position).toBe(1);
    expect(view(game).log.at(-1)).toEqual({ kind: 'click', userId: 'a' });
    scheduler.advance(3_000);
    expect(view(game).phase).toBe('playing');
    expect(view(game).turnId).toBe('b');
  });

  it('la bala elimina al jugador y gana el último en pie', () => {
    const { game, outcome } = rig(['a', 'b'], [0]);
    pull(game, 'a'); // bala en la cámara 0
    expect(game.isFinished()).toBe(true);
    const res = outcome()!.results;
    expect(res.find((r) => r.userId === 'a')?.place).toBe(2);
    expect(res.find((r) => r.userId === 'b')?.place).toBe(1);
    expect(res.find((r) => r.userId === 'a')?.extraStats).toContain('bangs');
  });

  it('tras una muerte el arma se recarga y sigue la partida', () => {
    const { game, scheduler } = rig(['a', 'b', 'c'], [0, 5]);
    pull(game, 'a');
    expect(view(game).players.find((p) => p.id === 'a')?.out).toBe(true);
    expect(view(game).position).toBe(0);
    scheduler.advance(3_000);
    expect(view(game).turnId).toBe('b');
  });

  it('girar el tambor mezcla la bala y dispara', () => {
    const { game } = rig(['a', 'b'], [5, 0]);
    game.action('a', { type: 'spin' }); // la recarga pone la bala en 0 y dispara ahí
    expect(game.isFinished()).toBe(true);
  });

  it('sin tiempo, el sistema dispara por el jugador', () => {
    const { game, scheduler } = rig(['a', 'b', 'c'], [5]);
    scheduler.advance(15_000);
    expect(view(game).phase).toBe('between');
    expect(view(game).log.some((l) => l.kind === 'timeout' && l.userId === 'a')).toBe(true);
  });

  it('quien se va queda eliminado y gana el que queda', () => {
    const { game, outcome } = rig(['a', 'b'], [5]);
    game.playerLeft('a');
    expect(game.isFinished()).toBe(true);
    expect(outcome()!.results.find((r) => r.userId === 'b')?.place).toBe(1);
  });
});
