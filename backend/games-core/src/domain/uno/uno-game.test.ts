import { describe, expect, it } from 'vitest';
import type { GameOutcome } from '../game.js';
import { pointsForPlace } from '../scoring.js';
import type { Scheduler } from '../shared.js';
import { buildDeck, UnoGame, type UnoCard, type UnoColor, type UnoValue } from './uno-game.js';

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

let nextId = 1000;
const card = (color: UnoColor | 'wild', value: UnoValue): UnoCard => ({ id: nextId++, color, value });

/** Partida con manos y mesa controladas para probar reglas concretas. */
function rig(ids: string[], hands: UnoCard[][], top: UnoCard, color: UnoColor = top.color as UnoColor) {
  const scheduler = new FakeScheduler();
  let outcome: GameOutcome | null = null;
  const game = new UnoGame(
    ids.map((id) => ({ id, username: id })),
    { isOnline: () => true, scheduler, speed: 1, onChange: () => {}, onFinished: (o) => (outcome = o), random: () => 0.5 },
  );
  game.start();
  const internals = game as unknown as {
    seats: { hand: UnoCard[] }[];
    discard: UnoCard[];
    currentColor: UnoColor;
    current: number;
    drawPile: UnoCard[];
  };
  internals.seats.forEach((s, i) => (s.hand = hands[i] ?? []));
  internals.discard = [top];
  internals.currentColor = color;
  internals.current = 0;
  internals.drawPile = Array.from({ length: 30 }, () => card('blue', '1'));
  return { game, scheduler, outcome: () => outcome, internals };
}

describe('baraja y puntos', () => {
  it('la baraja tiene 108 cartas', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(108);
    expect(deck.filter((c) => c.value === 'wild4')).toHaveLength(4);
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
  });

  it('los puntos bajan con la posición y nunca son menores a 1', () => {
    expect([1, 2, 3, 4].map((p) => pointsForPlace(p, 4))).toEqual([10, 8, 5, 3]);
    expect([1, 2].map((p) => pointsForPlace(p, 2))).toEqual([10, 5]);
    expect(pointsForPlace(10, 10)).toBeGreaterThanOrEqual(1);
  });
});

describe('UnoGame', () => {
  it('reparte 7 cartas y la mesa empieza con una carta numérica', () => {
    const game = new UnoGame(
      ['a', 'b', 'c'].map((id) => ({ id, username: id })),
      { isOnline: () => true, scheduler: new FakeScheduler(), speed: 1, onChange: () => {}, onFinished: () => {} },
    );
    game.start();
    const view = game.view('a');
    expect(view.myHand).toHaveLength(7);
    expect(view.top && /^\d$/.test(view.top.value)).toBe(true);
  });

  it('solo deja jugar cartas del mismo color o valor, y comodines', () => {
    const { game } = rig(['a', 'b'], [[card('green', '5'), card('red', '5'), card('wild', 'wild')], [card('blue', '2')]], card('red', '9'));
    const [green5, red5] = game.view('a').myHand;
    expect(() => game.action('a', { type: 'play', cardId: green5!.id, uno: true })).toThrow('no se puede jugar');
    expect(game.view('a').playable).toContain(red5!.id);
    game.action('a', { type: 'play', cardId: red5!.id });
    expect(game.view('b').top?.id).toBe(red5!.id);
  });

  it('un comodín exige elegir color y cambia el color activo', () => {
    const { game } = rig(['a', 'b'], [[card('wild', 'wild'), card('red', '1')], [card('blue', '2'), card('blue', '3')]], card('red', '9'));
    const wild = game.view('a').myHand[0]!;
    expect(() => game.action('a', { type: 'play', cardId: wild.id })).toThrow('Elige un color');
    game.action('a', { type: 'play', cardId: wild.id, color: 'blue', uno: true });
    expect(game.view('b').currentColor).toBe('blue');
  });

  it('+2: el siguiente roba 2 y pierde el turno', () => {
    const { game } = rig(
      ['a', 'b', 'c'],
      [[card('red', 'draw2'), card('red', '1'), card('red', '2')], [card('blue', '1')], [card('blue', '2')]],
      card('red', '9'),
    );
    game.action('a', { type: 'play', cardId: game.view('a').myHand[0]!.id });
    expect(game.view('a').players.find((p) => p.id === 'b')?.cards).toBe(3);
    expect(game.view('a').turnId).toBe('c');
  });

  it('con 2 jugadores, reversa funciona como salto de turno', () => {
    const { game } = rig(['a', 'b'], [[card('red', 'reverse'), card('red', '1'), card('red', '2')], [card('blue', '1')]], card('red', '9'));
    game.action('a', { type: 'play', cardId: game.view('a').myHand[0]!.id });
    expect(game.view('a').turnId).toBe('a');
  });

  it('con 3 jugadores, reversa invierte el sentido', () => {
    const { game } = rig(
      ['a', 'b', 'c'],
      [[card('red', 'reverse'), card('red', '1'), card('red', '2')], [card('blue', '1')], [card('blue', '2')]],
      card('red', '9'),
    );
    game.action('a', { type: 'play', cardId: game.view('a').myHand[0]!.id });
    expect(game.view('a').turnId).toBe('c');
  });

  it('quedarse con 1 carta sin decir UNO cuesta 2 cartas', () => {
    const { game } = rig(['a', 'b'], [[card('red', '1'), card('red', '2')], [card('blue', '1')]], card('red', '9'));
    game.action('a', { type: 'play', cardId: game.view('a').myHand[0]!.id });
    expect(game.view('a').players.find((p) => p.id === 'a')?.cards).toBe(3);
  });

  it('decir UNO evita la penalización', () => {
    const { game } = rig(['a', 'b'], [[card('red', '1'), card('red', '2')], [card('blue', '1')]], card('red', '9'));
    game.action('a', { type: 'play', cardId: game.view('a').myHand[0]!.id, uno: true });
    expect(game.view('a').players.find((p) => p.id === 'a')?.cards).toBe(1);
  });

  it('robar una carta jugable permite jugarla o pasar; si no es jugable, pasa solo', () => {
    const { game, internals } = rig(['a', 'b'], [[card('green', '1')], [card('blue', '1')]], card('red', '9'));
    internals.drawPile.push(card('red', '4')); // la próxima carta a robar es jugable
    game.action('a', { type: 'draw' });
    expect(game.view('a').canPass).toBe(true);
    expect(game.view('a').playable).toHaveLength(1);
    game.action('a', { type: 'pass' });
    expect(game.view('a').turnId).toBe('b');
    game.action('b', { type: 'draw' }); // azul 1 sobre rojo 9: no jugable → pasa solo
    expect(game.view('a').turnId).toBe('a');
  });

  it('no deja actuar fuera de turno', () => {
    const { game } = rig(['a', 'b'], [[card('red', '1'), card('red', '2')], [card('red', '3')]], card('red', '9'));
    expect(() => game.action('b', { type: 'draw' })).toThrow('No es tu turno');
  });

  it('al agotarse el tiempo el jugador roba una carta y pasa el turno', () => {
    const { game, scheduler } = rig(['a', 'b'], [[card('green', '1')], [card('green', '2')]], card('red', '9'));
    scheduler.advance(30_000);
    expect(game.view('a').players.find((p) => p.id === 'a')?.cards).toBe(2);
    expect(game.view('a').turnId).toBe('b');
  });

  it('el orden en que se quedan sin cartas define el ranking y la partida sigue hasta el último', () => {
    const { game, outcome } = rig(
      ['a', 'b', 'c'],
      [[card('red', '1')], [card('red', '2')], [card('blue', '7'), card('blue', '8')]],
      card('red', '9'),
    );
    game.action('a', { type: 'play', cardId: game.view('a').myHand[0]!.id, uno: true });
    expect(game.view('a').players.find((p) => p.id === 'a')?.place).toBe(1);
    expect(game.isFinished()).toBe(false);
    game.action('b', { type: 'play', cardId: game.view('b').myHand[0]!.id, uno: true });
    expect(game.isFinished()).toBe(true);
    expect(outcome()?.results.map((r) => [r.userId, r.place])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    expect(game.view('c').results?.map((r) => r.points)).toEqual([10, 7, 3]);
  });

  it('si alguien abandona y queda uno solo, termina y el que se fue queda último', () => {
    const { game, outcome } = rig(['a', 'b'], [[card('red', '1'), card('red', '2')], [card('red', '3'), card('red', '4')]], card('red', '9'));
    game.playerLeft('b');
    expect(game.isFinished()).toBe(true);
    expect(outcome()?.results.map((r) => r.userId)).toEqual(['a', 'b']);
  });
});
