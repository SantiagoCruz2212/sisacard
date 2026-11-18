import { describe, expect, it } from 'vitest';
import type { GameOutcome } from '../game.js';
import { FakeScheduler } from '../fake-scheduler.js';
import { BlackjackGame, buildShoe, handValue, type BjCard, type Rank, type Suit } from './blackjack-game.js';

let nextId = 1;
const SUITS: Record<string, Suit> = { S: '♠', H: '♥', D: '♦', C: '♣' };
/** 'AS' = as de picas, '10H' = diez de corazones, 'KD' = rey de diamantes. */
const card = (code: string): BjCard => ({ id: nextId++, rank: code.slice(0, -1) as Rank, suit: SUITS[code.slice(-1)] as Suit });
const hand = (...codes: string[]) => codes.map(card);

const FILLER = Array.from({ length: 30 }, () => '2C');

/**
 * Partida con barajas escritas a mano. Cada reparto consume un guion en orden de robo:
 * primero la 1.ª carta de cada jugador, luego la 2.ª, y después las cartas que se pidan.
 */
function rig(ids: string[], scripts: string[][]) {
  const scheduler = new FakeScheduler();
  let outcome: GameOutcome | null = null;
  let call = 0;
  const makeShoe = () => {
    const script = [...(scripts[call++] ?? []), ...FILLER];
    return script.map(card).reverse(); // robar = pop() desde el final
  };
  const game = new BlackjackGame(
    ids.map((id) => ({ id, username: id })),
    { isOnline: () => true, scheduler, speed: 1, onChange: () => {}, onFinished: (o) => (outcome = o) },
    makeShoe,
  );
  game.start();
  const me = (id: string) => game.view(id).players.find((p) => p.id === id)!;
  return { game, scheduler, outcome: () => outcome, me };
}

const stand = (g: BlackjackGame, id: string) => g.action(id, { type: 'stand' });
const hit = (g: BlackjackGame, id: string) => g.action(id, { type: 'hit' });

describe('handValue', () => {
  it('suma figuras como 10 y calcula el as como 1 u 11 según convenga', () => {
    expect(handValue(hand('KS', 'QH'))).toEqual({ value: 20, soft: false });
    expect(handValue(hand('AS', 'KS'))).toEqual({ value: 21, soft: true });
    expect(handValue(hand('AS', 'AH', '9D'))).toEqual({ value: 21, soft: true });
    expect(handValue(hand('AS', '5H', 'KD'))).toEqual({ value: 16, soft: false });
    expect(handValue(hand('KS', 'QH', '5D')).value).toBe(25);
  });

  it('el zapato tiene 104 cartas con ids únicos', () => {
    const shoe = buildShoe();
    expect(shoe).toHaveLength(104);
    expect(new Set(shoe.map((c) => c.id)).size).toBe(104);
  });
});

describe('BlackjackGame', () => {
  it('reparte 2 cartas públicas a cada jugador y empieza el primero', () => {
    const { game, me } = rig(['a', 'b'], [['10S', '9S', '7S', '9H']]);
    expect(me('a').cards).toHaveLength(2);
    expect(game.view('b').players[0]!.cards).toHaveLength(2); // b ve las cartas de a
    expect(me('a').value).toBe(17);
    expect(game.view('a').turnId).toBe('a');
  });

  it('con 21 directo se planta solo y el turno pasa al siguiente', () => {
    const { game, me } = rig(['a', 'b'], [['AS', '9S', 'KS', '9H']]);
    expect(me('a').status).toBe('stood');
    expect(me('a').roundValues).toEqual([21]);
    expect(game.view('b').turnId).toBe('b');
  });

  it('solo juega quien tiene el turno', () => {
    const { game } = rig(['a', 'b'], [['10S', '9S', '7S', '9H']]);
    expect(() => stand(game, 'b')).toThrow('No es tu turno');
    expect(() => game.action('a', { type: 'bailar' })).toThrow('Acción desconocida');
  });

  it('pedir carta mantiene el turno; llegar a 21 planta automáticamente', () => {
    const { game, me } = rig(['a', 'b'], [['10S', '9S', '5S', '9H', '6H']]);
    hit(game, 'a'); // 10 + 5 + 6 = 21
    expect(me('a').value).toBe(21);
    expect(me('a').status).toBe('stood');
    expect(game.view('b').turnId).toBe('b');
  });

  it('si se acaba el tiempo, el jugador se planta', () => {
    const { game, scheduler, me } = rig(['a', 'b'], [['10S', '9S', '7S', '9H']]);
    scheduler.advance(20_000);
    expect(me('a').status).toBe('stood');
    expect(game.view('b').turnId).toBe('b');
  });

  it('al terminar la ronda 1 hay una pausa y luego se reparte la ronda 2 conservando los valores', () => {
    const { game, scheduler, me } = rig(['a', 'b'], [['10S', '9S', '7S', '9H'], ['10C', '10D', '2C', '3C']]);
    stand(game, 'a');
    stand(game, 'b');
    expect(game.phase).toBe('between');
    expect(me('a').roundValues).toEqual([17]);
    expect(me('b').roundValues).toEqual([18]);
    expect(() => hit(game, 'a')).toThrow('Espera');
    scheduler.advance(5_000);
    expect(game.phase).toBe('playing');
    expect(game.view('a').round).toBe(2);
    expect(me('a').cards).toHaveLength(2);
    expect(me('a').roundValues).toEqual([17]); // el total del ciclo sigue
  });

  it('quien se pasa de 21 queda eliminado al instante y el ciclo se reinicia', () => {
    const { game, scheduler, me } = rig(
      ['a', 'b', 'c'],
      [['10S', '9S', '8S', '6S', '9H', '8H', '10H'], ['3S', '4S', '5S', '6H', '7H']],
    );
    hit(game, 'a'); // 10 + 6 + 10 = 26
    expect(me('a').status).toBe('busted');
    expect(me('a').out).toBe(true);
    expect(game.view('b').log.some((l) => l.kind === 'bust' && l.userId === 'a')).toBe(true);
    expect(game.phase).toBe('between');
    scheduler.advance(5_000);
    const view = game.view('b');
    expect(view.phase).toBe('playing');
    expect(view.cycle).toBe(2);
    expect(view.round).toBe(1);
    expect(me('b').roundValues).toEqual([]);
    expect(me('b').cards).toHaveLength(2);
    expect(me('a').cards).toHaveLength(3); // el eliminado conserva su última mano a la vista
    expect(view.turnId).toBe('b'); // sigue sin turno para el eliminado
  });

  it('al terminar la ronda 2 sale quien quedó más lejos de 42 y el ciclo vuelve a empezar', () => {
    const { game, scheduler, me } = rig(
      ['a', 'b', 'c'],
      [
        ['10S', '9S', '10D', '10H', '9H', '7D'], // a 20, b 18, c 17
        ['10C', '10S', '10H', '2C', '9D', 'KD'], // a 12, b 19, c 20
      ],
    );
    for (const id of ['a', 'b', 'c']) stand(game, id);
    scheduler.advance(5_000);
    for (const id of ['a', 'b', 'c']) stand(game, id);
    // totales: a 32, b 37, c 37  →  sale a
    expect(me('a').out).toBe(true);
    expect(me('a').status).toBe('out');
    expect(me('a').total).toBe(32);
    expect(me('b').out).toBe(false);
    expect(game.view('b').log.some((l) => l.kind === 'cut' && l.ids?.includes('a'))).toBe(true);
    scheduler.advance(5_000);
    expect(game.view('b').cycle).toBe(2);
    expect(game.view('b').round).toBe(1);
    expect(me('b').roundValues).toEqual([]);
  });

  it('si todos empatan en el corte no sale nadie', () => {
    const { game, scheduler, me } = rig(['a', 'b'], [['10S', '10H', '8S', '8H'], ['10S', '10H', '8S', '8H']]);
    stand(game, 'a');
    stand(game, 'b');
    scheduler.advance(5_000);
    stand(game, 'a');
    stand(game, 'b');
    expect(me('a').out || me('b').out).toBe(false);
    expect(game.view('a').log.some((l) => l.kind === 'tie')).toBe(true);
    scheduler.advance(5_000);
    expect(game.view('a').cycle).toBe(2);
  });

  it('gana el último en pie: pasarse con 2 jugadores termina la partida', () => {
    const { game, outcome, me } = rig(['a', 'b'], [['10S', '10H', '8S', '6H', 'KH']]);
    stand(game, 'a');
    hit(game, 'b'); // 10 + 6 + 10 = 26
    expect(game.isFinished()).toBe(true);
    expect(me('b').status).toBe('busted');
    expect(outcome()?.results).toEqual([
      { userId: 'a', place: 1, extraStats: [] },
      { userId: 'b', place: 2, extraStats: ['busts'] },
    ]);
    expect(game.view('a').results?.map((r) => r.points)).toEqual([10, 5]);
  });

  it('eliminados a la vez en el corte comparten posición', () => {
    const script = ['10S', '10H', '10D', '7S', '7H', '9D']; // a 17, b 17, c 19
    const { game, scheduler, outcome } = rig(['a', 'b', 'c'], [script, script]);
    for (const id of ['a', 'b', 'c']) stand(game, id);
    scheduler.advance(5_000);
    for (const id of ['a', 'b', 'c']) stand(game, id);
    expect(game.isFinished()).toBe(true);
    const places = Object.fromEntries(outcome()!.results.map((r) => [r.userId, r.place]));
    expect(places).toEqual({ c: 1, a: 2, b: 2 });
    expect(outcome()!.results.find((r) => r.userId === 'a')?.extraStats).toEqual(['cuts']);
  });

  it('si un jugador abandona queda último y el otro gana', () => {
    const { game, outcome } = rig(['a', 'b'], [['10S', '10H', '8S', '8H']]);
    game.playerLeft('a');
    expect(game.isFinished()).toBe(true);
    expect(outcome()?.results.map((r) => [r.userId, r.place])).toEqual([['b', 1], ['a', 2]]);
  });

  it('si abandona quien tenía el turno, juega el siguiente', () => {
    const { game } = rig(['a', 'b', 'c'], [['10S', '9S', '8S', '6S', '9H', '8H']]);
    game.playerLeft('a');
    expect(game.view('b').turnId).toBe('b');
    expect(game.isFinished()).toBe(false);
  });

  it('si abandona alguien cuando todos los demás ya se plantaron, termina la ronda', () => {
    const { game } = rig(['a', 'b', 'c'], [['10S', '9S', '8S', '6S', '9H', '8H']]);
    stand(game, 'a');
    stand(game, 'b');
    game.playerLeft('c');
    expect(game.phase).toBe('between');
  });
});
