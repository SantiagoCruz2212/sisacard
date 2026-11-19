import { describe, expect, it } from 'vitest';
import type { GameOutcome } from '../game.js';
import { FakeScheduler } from '../fake-scheduler.js';
import { AmongUsGame, ROOMS } from './amongus-game.js';

const IDS = ['a', 'b', 'c', 'd'];

function rig(ids = IDS) {
  const scheduler = new FakeScheduler();
  let outcome: GameOutcome | null = null;
  const game = new AmongUsGame(
    ids.map((id) => ({ id, username: id })),
    { isOnline: () => true, scheduler, speed: 1, onChange: () => {}, onFinished: (o) => (outcome = o), random: () => 0.3 },
  );
  game.start();
  const roleOf = (id: string) => game.view(id).role;
  const impostor = ids.find((id) => roleOf(id) === 'impostor') as string;
  const crew = ids.filter((id) => id !== impostor);
  return { game, scheduler, outcome: () => outcome, impostor, crew };
}

const me = (g: AmongUsGame, id: string) => g.view(id).me!;
const walk = (g: AmongUsGame, s: FakeScheduler, id: string, dx: number, dy: number, ms: number) => {
  g.action(id, { type: 'move', dx, dy });
  s.advance(ms);
  g.action(id, { type: 'move', dx: 0, dy: 0 });
};

describe('AmongUsGame', () => {
  it('reparte un impostor y tareas solo a la tripulación; cada quien ve su rol', () => {
    const { game, impostor, crew } = rig();
    expect(me(game, impostor).tasks).toHaveLength(0);
    for (const id of crew) expect(me(game, id).tasks).toHaveLength(3);
    expect(game.view(crew[0] as string).players.some((p) => p.impostor)).toBe(false);
    expect(game.view('espectador').role).toBe('spectator');
  });

  it('el movimiento es en tiempo real y respeta los límites del mapa', () => {
    const { game, scheduler, crew } = rig();
    const id = crew[0] as string;
    const before = me(game, id).x;
    walk(game, scheduler, id, 1, 0, 1_000);
    expect(me(game, id).x).toBeGreaterThan(before + 15);
    walk(game, scheduler, id, 1, 0, 20_000);
    expect(me(game, id).x).toBeLessThanOrEqual(120);
  });

  it('una tarea se completa quedándose quieto junto a la estación', () => {
    const { game, scheduler, crew } = rig();
    const id = crew[0] as string;
    const t = me(game, id).tasks[0]!;
    // Teletransporte no existe: se camina hasta la estación.
    const start = me(game, id);
    const dx = t.x - start.x;
    const dy = t.y - start.y;
    const len = Math.hypot(dx, dy);
    walk(game, scheduler, id, dx / len, dy / len, (len / 20) * 1000 + 50);
    expect(me(game, id).canTask).toBe(true);
    game.action(id, { type: 'task' });
    scheduler.advance(2_600);
    expect(me(game, id).tasks.find((x) => x.id === t.id)?.done).toBe(true);
    expect(game.view(id).tasksDone).toBe(1);
  });

  it('moverse cancela la tarea en curso', () => {
    const { game, scheduler, crew } = rig();
    const id = crew[0] as string;
    const t = me(game, id).tasks[0]!;
    const start = me(game, id);
    const len = Math.hypot(t.x - start.x, t.y - start.y);
    walk(game, scheduler, id, (t.x - start.x) / len, (t.y - start.y) / len, (len / 20) * 1000 + 50);
    game.action(id, { type: 'task' });
    scheduler.advance(500);
    walk(game, scheduler, id, 0, 1, 100);
    scheduler.advance(3_000);
    expect(me(game, id).tasks.find((x) => x.id === t.id)?.done).toBe(false);
  });

  it('el impostor no puede eliminar antes del enfriamiento ni lejos de su víctima', () => {
    const { game, scheduler, impostor } = rig();
    expect(() => game.action(impostor, { type: 'kill' })).toThrow('enfriando');
    scheduler.advance(10_100);
    // Todos arrancan en círculo en la cafetería: hay alguien a menos de 10 si el círculo es chico; si no, falla por distancia.
    const near = game.view(impostor).me!.canKill;
    if (!near) expect(() => game.action(impostor, { type: 'kill' })).toThrow('al alcance');
  });

  it('eliminar deja un cuerpo; reportarlo abre una reunión y se vota para echar al impostor', () => {
    const { game, scheduler, impostor, crew, outcome } = rig();
    scheduler.advance(10_100);
    // Juntar al impostor con una víctima: la víctima camina hacia el impostor.
    const victim = crew[0] as string;
    const iv = me(game, impostor);
    const vv = me(game, victim);
    const len = Math.hypot(iv.x - vv.x, iv.y - vv.y);
    walk(game, scheduler, victim, (iv.x - vv.x) / len, (iv.y - vv.y) / len, (Math.max(0, len - 3) / 20) * 1000);
    expect(game.view(impostor).me!.canKill).toBe(true);
    game.action(impostor, { type: 'kill' });
    expect(game.view(victim).me!.alive).toBe(false);
    expect(game.view(impostor).bodies).toHaveLength(1);
    // Los vivos no ven al fantasma, el fantasma sí ve a todos.
    expect(game.view(impostor).players.some((p) => p.id === victim)).toBe(false);
    expect(game.view(victim).players.length).toBeGreaterThanOrEqual(3);

    const reporter = crew[1] as string;
    // Solo reporta quien está cerca del cuerpo: el impostor (que está encima) puede.
    game.action(impostor, { type: 'report' });
    expect(game.view(reporter).phase).toBe('meeting');
    expect(game.view(reporter).bodies).toHaveLength(0);

    for (const id of crew.filter((c) => c !== victim)) game.action(id, { type: 'vote', target: impostor });
    game.action(impostor, { type: 'vote', target: 'skip' });
    const v = game.view(reporter);
    expect(v.phase).toBe('ended'); // el último impostor fue echado: gana la tripulación
    expect(v.winner).toBe('crew');
    const res = outcome()!.results;
    expect(res.find((r) => r.userId === impostor)?.place).toBeGreaterThan(1);
    expect(res.find((r) => r.userId === crew[1])?.place).toBe(1);
  });

  it('un empate o saltar el voto no echa a nadie y la partida continúa', () => {
    const { game, scheduler, impostor, crew } = rig();
    scheduler.advance(10_100);
    const victim = crew[0] as string;
    const iv = me(game, impostor);
    const vv = me(game, victim);
    const len = Math.hypot(iv.x - vv.x, iv.y - vv.y);
    walk(game, scheduler, victim, (iv.x - vv.x) / len, (iv.y - vv.y) / len, (Math.max(0, len - 3) / 20) * 1000);
    game.action(impostor, { type: 'kill' });
    // 3 jugadores vivos: impostor + 2 de tripulación → 1 vs 2, sigue la partida.
    game.action(impostor, { type: 'report' });
    for (const id of [impostor, crew[1] as string, crew[2] as string]) game.action(id, { type: 'vote', target: 'skip' });
    expect(game.view(impostor).phase).toBe('result');
    scheduler.advance(5_100);
    expect(game.view(impostor).phase).toBe('playing');
  });

  it('el impostor gana al igualar en número a la tripulación', () => {
    const { game, scheduler, impostor, crew, outcome } = rig(['a', 'b', 'c']);
    scheduler.advance(10_100);
    const victim = crew[0] as string;
    const iv = me(game, impostor);
    const vv = me(game, victim);
    const len = Math.hypot(iv.x - vv.x, iv.y - vv.y);
    walk(game, scheduler, victim, (iv.x - vv.x) / len, (iv.y - vv.y) / len, (Math.max(0, len - 3) / 20) * 1000);
    game.action(impostor, { type: 'kill' }); // 1 impostor vs 1 tripulante
    expect(game.isFinished()).toBe(true);
    expect(game.view(impostor).winner).toBe('impostor');
    expect(outcome()!.results.find((r) => r.userId === impostor)?.place).toBe(1);
  });

  it('la tripulación gana al completar todas las tareas', () => {
    const { game, scheduler, crew } = rig();
    for (const id of crew) {
      for (const t of me(game, id).tasks) {
        const cur = me(game, id);
        const len = Math.hypot(t.x - cur.x, t.y - cur.y);
        if (len > 1) walk(game, scheduler, id, (t.x - cur.x) / len, (t.y - cur.y) / len, (len / 20) * 1000 + 50);
        game.action(id, { type: 'task' });
        scheduler.advance(2_600);
      }
    }
    expect(game.view('a').winner).toBe('crew');
  });

  it('quien se va deja de contar; si solo quedan impostores gana el impostor', () => {
    const { game, impostor, crew } = rig(['a', 'b', 'c']);
    game.playerLeft(crew[0] as string);
    expect(game.isFinished()).toBe(true);
    expect(game.view(impostor).winner).toBe('impostor');
  });

  it('el mapa define 6 salas', () => {
    expect(ROOMS).toHaveLength(6);
  });
});
