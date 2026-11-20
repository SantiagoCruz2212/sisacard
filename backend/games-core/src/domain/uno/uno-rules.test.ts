import { describe, expect, it } from 'vitest';
import { FakeScheduler } from '../fake-scheduler.js';
import { GAMES } from '../games.js';
import { Room } from '../room.js';
import { buildFlipDeck, buildInfinityDeck, DARK_COLORS, LIGHT_COLORS, type CardFace, type UnoCard, type UnoColor, type UnoSide, type UnoValue } from './uno-cards.js';
import { UnoGame } from './uno-game.js';
import { defaultUnoSettings, parseUnoSettings, type UnoSettings } from './uno-settings.js';

let nextId = 5000;
const card = (color: UnoColor | 'wild', value: UnoValue, dark?: CardFace): UnoCard => ({ id: nextId++, color, value, ...(dark ? { dark } : {}) });

interface Internals {
  seats: { hand: UnoCard[] }[];
  discard: UnoCard[];
  currentColor: UnoColor;
  currentValue: UnoValue;
  current: number;
  drawPile: UnoCard[];
  side: UnoSide;
  dir: 1 | -1;
}

/** Partida con manos, mesa y reglas controladas. Por defecto juega 'a' y el mazo son azules 1. */
function rig(hands: UnoCard[][], top: UnoCard, settings: Partial<UnoSettings> = {}, random = () => 0.5) {
  const ids = hands.map((_, i) => String.fromCharCode(97 + i));
  const scheduler = new FakeScheduler();
  const game = new UnoGame(
    ids.map((id) => ({ id, username: id })),
    { isOnline: () => true, scheduler, speed: 1, onChange: () => {}, onFinished: () => {}, random },
    { ...defaultUnoSettings(), ...settings },
  );
  game.start();
  const internals = game as unknown as Internals;
  internals.seats.forEach((s, i) => (s.hand = hands[i] ?? []));
  internals.discard = [top];
  internals.side = 'light';
  internals.currentColor = top.color as UnoColor;
  internals.currentValue = top.value;
  internals.current = 0;
  internals.drawPile = Array.from({ length: 40 }, () => card('blue', '1'));
  const cards = (id: string) => game.view(id).players.find((p) => p.id === id)?.cards;
  const play = (id: string, c: UnoCard, extra: object = {}) => game.action(id, { type: 'play', cardId: c.id, uno: true, ...extra });
  return { game, scheduler, internals, cards, play };
}

const filler = () => [card('green', '8'), card('green', '9'), card('yellow', '8')];

describe('barajas', () => {
  it('Infinity suma 39 cartas a la clásica, todas con id distinto', () => {
    const deck = buildInfinityDeck();
    expect(deck).toHaveLength(147);
    expect(new Set(deck.map((c) => c.id)).size).toBe(147);
    expect(deck.filter((c) => c.value === 'dice20')).toHaveLength(1);
    expect(deck.filter((c) => c.value === 'number')).toHaveLength(6);
  });

  it('Flip tiene 112 cartas de dos caras: colores claros de un lado y oscuros del otro', () => {
    const deck = buildFlipDeck((a) => a);
    expect(deck).toHaveLength(112);
    for (const c of deck) {
      expect([...LIGHT_COLORS, 'wild']).toContain(c.color);
      expect([...DARK_COLORS, 'wild']).toContain(c.dark?.color);
    }
    expect(deck.filter((c) => c.value === 'draw1')).toHaveLength(8);
    expect(deck.filter((c) => c.dark?.value === 'wildDrawColor')).toHaveLength(4);
    expect(deck.filter((c) => c.value === 'flip')).toHaveLength(8);
  });

  it('Infinity + Flip: 155 cartas con las Infinity en los dos lados, cada una con los colores de su lado', () => {
    const deck = buildFlipDeck((a) => a, true);
    expect(deck).toHaveLength(155);
    expect(new Set(deck.map((c) => c.id)).size).toBe(155);
    for (const c of deck) {
      expect([...LIGHT_COLORS, 'wild']).toContain(c.color);
      expect([...DARK_COLORS, 'wild']).toContain(c.dark?.color);
    }
    const light = deck.map((c) => c.value);
    const dark = deck.map((c) => c.dark?.value);
    for (const side of [light, dark]) {
      expect(side.filter((v) => v === 'flip')).toHaveLength(12); // una Flip más por color
      expect(side.filter((v) => v === 'dice20')).toHaveLength(1);
      expect(side.filter((v) => v === 'joker')).toHaveLength(2);
    }
    expect(deck.filter((c) => c.value === 'draw4' && c.color === 'red')).toHaveLength(1);
    expect(deck.filter((c) => c.dark?.value === 'draw4' && c.dark.color === 'purple')).toHaveLength(1);
  });

  it('una partida Infinity + Flip se juega del lado oscuro con cartas Infinity', () => {
    const { game, cards, internals } = rig([[card('red', '1', { color: 'wild', value: 'plusAll' }), ...filler()], filler(), filler()], card('red', '5'), {
      flip: true,
      infinity: true,
    });
    internals.side = 'dark';
    internals.currentColor = 'pink';
    game.action('a', { type: 'play', cardId: internals.seats[0]!.hand[0]!.id, color: 'teal', uno: true });
    expect([cards('b'), cards('c')]).toEqual([7, 7]);
    expect(game.view('a')).toMatchObject({ turnId: 'a', currentColor: 'teal', side: 'dark' });  });

  it('la partida Flip empieza del lado claro con una carta numérica', () => {
    const game = new UnoGame(
      [{ id: 'a', username: 'a' }, { id: 'b', username: 'b' }],
      { isOnline: () => true, scheduler: new FakeScheduler(), speed: 1, onChange: () => {}, onFinished: () => {} },
      { ...defaultUnoSettings(), flip: true },
    );
    game.start();
    const view = game.view('a');
    expect(view.side).toBe('light');
    expect(view.top && /^\d$/.test(view.top.value)).toBe(true);
    expect(view.players.find((p) => p.id === 'b')?.backs).toHaveLength(7); // ves la otra cara de las cartas ajenas
    expect(view.players.find((p) => p.id === 'a')?.backs).toBeNull(); // pero no la de las tuyas
  });
});

describe('opciones de la sala', () => {
  it('se normalizan: lo desconocido se ignora', () => {
    expect(parseUnoSettings({ deck: 'nope', stacking: true, jumpIn: 'yes', extra: 1 })).toEqual({
      ...defaultUnoSettings(),
      stacking: true,
    });
  });

  it('acepta el formato anterior de una sola baraja', () => {
    expect(parseUnoSettings({ deck: 'infinity' })).toMatchObject({ infinity: true, flip: false });
    expect(parseUnoSettings({ deck: 'flip' })).toMatchObject({ infinity: false, flip: true });
    expect(parseUnoSettings({ infinity: true, flip: true })).toMatchObject({ infinity: true, flip: true });
  });

  it('solo el anfitrión las cambia y solo antes de empezar', () => {
    const room = new Room('R', { id: 'a', username: 'a' }, GAMES.uno);
    room.join({ id: 'b', username: 'b' });
    expect(room.settings).toEqual(defaultUnoSettings());
    expect(() => room.updateSettings('b', { flip: true })).toThrow('anfitrión');
    room.updateSettings('a', { flip: true, catchUno: true });
    expect(room.settings).toMatchObject({ flip: true, catchUno: true });
    room.start('a', () => true, (players) =>
      GAMES.uno.create(players, { isOnline: () => true, scheduler: new FakeScheduler(), speed: 1, onChange: () => {}, onFinished: () => {} }, room.settings),
    );
    expect(room.match?.view('a')).toMatchObject({ settings: { flip: true }, side: 'light' });
    expect(() => room.updateSettings('a', { flip: false })).toThrow('en curso');
  });
});

describe('apilar +2/+4', () => {
  it('se responde con un + igual o mayor y el que no puede roba todo y pierde el turno', () => {
    const plus2 = card('red', 'draw2');
    const plus4 = card('wild', 'wild4');
    const { game, cards, play } = rig([[plus2, ...filler()], [plus4, ...filler()], [card('blue', 'draw2'), ...filler()]], card('red', '5'), {
      stacking: true,
    });
    play('a', plus2);
    expect(game.view('b').penalty).toMatchObject({ amount: 2, victimId: 'b' });
    expect(game.view('b').playable).toEqual([plus4.id]); // solo puede responder con un +
    play('b', plus4, { color: 'green' });
    expect(game.view('c').penalty?.amount).toBe(6);
    expect(game.view('c').playable).toEqual([]); // un +2 no alcanza a un +4
    expect(() => game.action('c', { type: 'play', cardId: game.view('c').myHand[0]!.id })).toThrow('igual o mayor');
    game.action('c', { type: 'draw' });
    expect(cards('c')).toBe(4 + 6);
    expect(game.view('a').turnId).toBe('a');
    expect(game.view('a').penalty).toBeNull();
  });

  it('sin la regla, el +2 se cobra al instante como siempre', () => {
    const plus2 = card('red', 'draw2');
    const { game, cards, play } = rig([[plus2, ...filler()], [card('blue', 'draw2')], filler()], card('red', '5'));
    play('a', plus2);
    expect(cards('b')).toBe(3);
    expect(game.view('a').turnId).toBe('c');
  });
});

describe('desafío al +4', () => {
  it('si el +4 era ilegal (tenía el color), quien lo jugó roba 4 y el desafiante juega normal', () => {
    const plus4 = card('wild', 'wild4');
    const { game, cards, play } = rig([[plus4, card('red', '1'), card('green', '3')], filler(), filler()], card('red', '5'), {
      challenge: true,
    });
    play('a', plus4, { color: 'blue' });
    expect(game.view('b').penalty).toMatchObject({ amount: 4, canChallenge: true });
    game.action('b', { type: 'challenge' });
    expect(cards('a')).toBe(2 + 4);
    expect(cards('b')).toBe(3);
    expect(game.view('b').turnId).toBe('b');
    expect(game.view('b').penalty).toBeNull();
  });

  it('si era legal, el desafiante roba 6 y pierde el turno', () => {
    const plus4 = card('wild', 'wild4');
    const { game, cards, play } = rig([[plus4, card('green', '3'), card('green', '4')], filler(), filler()], card('red', '5'), {
      challenge: true,
    });
    play('a', plus4, { color: 'blue' });
    game.action('b', { type: 'challenge' });
    expect(cards('b')).toBe(3 + 6);
    expect(game.view('a').turnId).toBe('c');
  });

  it('aceptar el +4 es robar 4', () => {
    const plus4 = card('wild', 'wild4');
    const { game, cards, play } = rig([[plus4, card('green', '3'), card('green', '4')], filler(), filler()], card('red', '5'), {
      challenge: true,
    });
    play('a', plus4, { color: 'blue' });
    game.action('b', { type: 'draw' });
    expect(cards('b')).toBe(7);
    expect(game.view('a').turnId).toBe('c');
  });
});

describe('regla 7-0', () => {
  it('el 7 cambia tu mano con quien elijas', () => {
    const seven = card('red', '7');
    const bHand = [card('yellow', '1'), card('yellow', '2'), card('yellow', '3'), card('yellow', '4')];
    const { game, cards, play } = rig([[seven, card('green', '1'), card('green', '2')], filler(), bHand], card('red', '5'), {
      sevenZero: true,
    });
    expect(() => play('a', seven)).toThrow('Elige a un jugador');
    play('a', seven, { target: 'c' });
    expect(cards('a')).toBe(4);
    expect(cards('c')).toBe(2);
    expect(game.view('a').myHand.map((c) => c.id)).toEqual(bHand.map((c) => c.id));
  });

  it('el 0 pasa todas las manos en el sentido del juego', () => {
    const zero = card('red', '0');
    const aRest = [card('green', '1'), card('green', '2')];
    const bHand = [card('yellow', '1')];
    const cHand = [card('blue', '7'), card('blue', '8'), card('blue', '9')];
    const { game } = rig([[zero, ...aRest], bHand, cHand], card('red', '5'), { sevenZero: true });
    game.action('a', { type: 'play', cardId: zero.id });
    expect(game.view('b').myHand.map((c) => c.id)).toEqual(aRest.map((c) => c.id));
    expect(game.view('c').myHand.map((c) => c.id)).toEqual(bHand.map((c) => c.id));
    expect(game.view('a').myHand.map((c) => c.id)).toEqual(cHand.map((c) => c.id));
  });
});

describe('jump-in', () => {
  it('una carta idéntica se juega fuera de turno y el turno sigue desde ahí', () => {
    const red5 = card('red', '5');
    const { game, play } = rig([[card('green', '1'), card('green', '2')], filler(), [red5, ...filler()], filler()], card('red', '5'), {
      jumpIn: true,
    });
    expect(game.view('c').playable).toEqual([red5.id]);
    play('c', red5);
    expect(game.view('a').top?.id).toBe(red5.id);
    expect(game.view('a').turnId).toBe('d');
  });

  it('sin la regla, o si la carta no es idéntica, no se puede', () => {
    const red5 = card('red', '5');
    const blue5 = card('blue', '5');
    const off = rig([filler(), [red5, ...filler()]], card('red', '5'));
    expect(() => off.play('b', red5)).toThrow('No es tu turno');
    const on = rig([filler(), [blue5, ...filler()]], card('red', '5'), { jumpIn: true });
    expect(() => on.play('b', blue5)).toThrow('No es tu turno');
  });
});

describe('atrapar el UNO', () => {
  const setup = () => {
    const red1 = card('red', '1');
    const r = rig([[red1, card('red', '2')], filler(), filler()], card('red', '5'), { catchUno: true });
    r.game.action('a', { type: 'play', cardId: red1.id }); // sin decir UNO
    return r;
  };

  it('olvidar el UNO no cuesta solo: otro jugador puede atraparte y robas 2', () => {
    const { game, cards } = setup();
    expect(cards('a')).toBe(1);
    expect(game.view('c').players.find((p) => p.id === 'a')?.vulnerable).toBe(true);
    game.action('c', { type: 'catch', target: 'a' });
    expect(cards('a')).toBe(3);
    expect(() => game.action('c', { type: 'catch', target: 'a' })).toThrow('No hay a quién atrapar');
  });

  it('si dices UNO a tiempo ya no te pueden atrapar', () => {
    const { game, cards } = setup();
    game.action('a', { type: 'uno' });
    expect(() => game.action('c', { type: 'catch', target: 'a' })).toThrow('No hay a quién atrapar');
    expect(cards('a')).toBe(1);
  });

  it('la ventana se cierra cuando el siguiente jugador actúa', () => {
    const { game } = setup();
    game.action('b', { type: 'draw' });
    expect(() => game.action('c', { type: 'catch', target: 'a' })).toThrow('No hay a quién atrapar');
  });
});

describe('cartas de UNO Infinity', () => {
  it('# de color entra sobre cualquier número y vale el número que elijas', () => {
    const hash = card('green', 'number');
    const { game, play } = rig([[hash, ...filler()], [card('yellow', '3'), card('yellow', '4')]], card('red', '5'));
    expect(game.view('a').playable).toContain(hash.id);
    expect(() => play('a', hash)).toThrow('Elige un número');
    play('a', hash, { number: '3' });
    expect(game.view('b').currentValue).toBe('3');
    expect(game.view('b').currentColor).toBe('green');
    expect(game.view('b').playable).toHaveLength(1); // el amarillo 3 empareja por número
  });

  it('# comodín pide color y número', () => {
    const hash = card('wild', 'number');
    const { game, play } = rig([[hash, ...filler()], filler()], card('red', 'skip'));
    expect(() => play('a', hash, { number: '4' })).toThrow('Elige un color');
    play('a', hash, { number: '4', color: 'blue' });
    expect(game.view('b')).toMatchObject({ currentColor: 'blue', currentValue: '4' });
  });

  it('+4 de color: el siguiente roba 4 y pierde el turno', () => {
    const plus4 = card('red', 'draw4');
    const { game, cards, play } = rig([[plus4, ...filler()], filler(), filler()], card('red', '5'));
    play('a', plus4);
    expect(cards('b')).toBe(7);
    expect(game.view('a').turnId).toBe('c');
  });

  it('x2: el siguiente roba tantas cartas como tiene', () => {
    const x2 = card('wild', 'double');
    const { game, cards, play } = rig([[x2, ...filler()], [...filler(), card('red', '1')], filler()], card('red', '5'));
    play('a', x2, { color: 'red' });
    expect(cards('b')).toBe(8);
    expect(game.view('a').turnId).toBe('c');
  });

  it('/2: eliges la mitad de tu mano para descartar y después pasa el turno', () => {
    const half = card('wild', 'half');
    const rest = [card('green', '1'), card('green', '2'), card('green', '3'), card('green', '4'), card('green', '5')];
    const { game, cards, play } = rig([[half, ...rest], filler()], card('red', '5'));
    play('a', half, { color: 'red' });
    expect(game.view('a').pending).toEqual({ kind: 'discard', count: 2 });
    expect(game.view('a').turnId).toBe('a');
    expect(() => game.action('a', { type: 'discard', cardIds: [rest[0]!.id] })).toThrow('Elige 2');
    game.action('a', { type: 'discard', cardIds: [rest[0]!.id, rest[1]!.id] });
    expect(cards('a')).toBe(3);
    expect(game.view('a').turnId).toBe('b');
    expect(game.view('a').top?.id).toBe(half.id); // lo descartado queda debajo
  });

  it('/2: si se acaba el tiempo se descartan solas', () => {
    const half = card('wild', 'half');
    const { game, cards, play, scheduler } = rig([[half, ...filler(), card('red', '1')], filler()], card('red', '5'));
    play('a', half, { color: 'red' });
    scheduler.advance(30_000);
    expect(cards('a')).toBe(2);
    expect(game.view('a').turnId).toBe('b');
  });

  it('-1: descartas una carta más; si era la última, terminas', () => {
    const minus = card('red', 'minus1');
    const last = card('green', '7');
    const { game, play } = rig([[minus, last], filler(), filler()], card('red', '5'));
    play('a', minus);
    expect(game.view('a').pending).toEqual({ kind: 'discard', count: 1 });
    game.action('a', { type: 'discard', cardIds: [last.id] });
    expect(game.view('a').players.find((p) => p.id === 'a')?.place).toBe(1);
    expect(game.view('b').turnId).toBe('b');
  });

  it('++4: todos los demás roban 4 y vuelves a jugar', () => {
    const pp = card('wild', 'plusAll');
    const { game, cards, play } = rig([[pp, ...filler()], filler(), filler()], card('red', '5'));
    play('a', pp, { color: 'green' });
    expect([cards('b'), cards('c')]).toEqual([7, 7]);
    expect(game.view('a').turnId).toBe('a');
  });

  it('+4T: eliges quién roba 4', () => {
    const t4 = card('wild', 'target4');
    const { game, cards, play } = rig([[t4, ...filler()], filler(), filler()], card('red', '5'));
    play('a', t4, { color: 'green', target: 'c' });
    expect([cards('b'), cards('c')]).toEqual([3, 7]);
    expect(game.view('a').turnId).toBe('b');
  });

  it('Replay de color o comodín: vuelves a jugar', () => {
    const replay = card('red', 'replay');
    const wildReplay = card('wild', 'replay');
    const { game, play } = rig([[replay, wildReplay, ...filler()], filler()], card('red', '5'));
    play('a', replay);
    expect(game.view('a').turnId).toBe('a');
    play('a', wildReplay, { color: 'green' });
    expect(game.view('a').turnId).toBe('a');
  });

  it('dados: el siguiente roba lo que salga', () => {
    const d6 = card('wild', 'dice6');
    const { game, cards, play } = rig([[d6, ...filler()], filler(), filler()], card('red', '5'), {}, () => 0.5);
    play('a', d6, { color: 'red' });
    expect(cards('b')).toBe(3 + 4); // 1 + floor(0.5 * 6)
    const log = game.view('a').log;
    const diceAt = log.findIndex((e) => e.kind === 'dice');
    expect(log[diceAt]).toMatchObject({ userId: 'a', roll: 4, count: 6 });
    // La animación del dado se apoya en esto: ids crecientes y el robo de la víctima justo después.
    expect(log[diceAt + 1]).toMatchObject({ kind: 'draw', userId: 'b', count: 4 });
    expect(log.map((e) => e.id)).toEqual([...log.map((e) => e.id)].sort((x, y) => x - y));
    expect(new Set(log.map((e) => e.id)).size).toBe(log.length);
    expect(game.view('a').turnId).toBe('c');
  });

  it('ojo: ves la mano de quien elijas por un rato, solo tú', () => {
    const eye = card('wild', 'eye');
    const cHand = [card('blue', '7'), card('wild', 'joker')];
    const { game, play, scheduler } = rig([[eye, ...filler()], filler(), cHand], card('red', '5'));
    play('a', eye, { color: 'red', target: 'c' });
    expect(game.view('a').reveal).toMatchObject({ targetId: 'c', cards: [{ color: 'blue', value: '7' }, { color: 'wild', value: 'joker' }] });
    expect(game.view('b').reveal).toBeNull();
    scheduler.advance(10_000);
    expect(game.view('a').reveal).toBeNull();
  });

  it('cambio de mano: intercambias tu mano con quien elijas', () => {
    const swap = card('wild', 'swap');
    const bHand = [card('blue', '7')];
    const { game, play } = rig([[swap, ...filler()], bHand], card('red', '5'));
    play('a', swap, { color: 'red' }); // con un solo rival no hace falta elegir
    expect(game.view('a').myHand.map((c) => c.id)).toEqual(bHand.map((c) => c.id));
    expect(game.view('b').myHand).toHaveLength(3);
  });

  it('joker: se juega cuando sea, incluso fuera de turno, y no cambia nada', () => {
    const joker = card('wild', 'joker');
    const { game, play } = rig([filler(), filler(), [joker, ...filler()]], card('red', '5'));
    expect(game.view('c').playable).toEqual([joker.id]);
    play('c', joker);
    expect(game.view('a')).toMatchObject({ turnId: 'a', currentColor: 'red', currentValue: '5' });
    expect(game.view('a').top?.id).toBe(joker.id);
  });

  it('rotación: todas las manos pasan al siguiente; la reversa cambia el sentido', () => {
    const rot = card('wild', 'rotate');
    const aRest = [card('green', '1'), card('green', '2')];
    const bHand = [card('yellow', '1')];
    const cHand = [card('blue', '7'), card('blue', '8'), card('blue', '9')];
    const { game, internals } = rig([[rot, ...aRest], bHand, cHand], card('red', '5'));
    internals.dir = -1;
    game.action('a', { type: 'play', cardId: rot.id, color: 'red' });
    expect(game.view('c').myHand.map((c) => c.id)).toEqual(aRest.map((c) => c.id));
    expect(game.view('a').myHand.map((c) => c.id)).toEqual(bHand.map((c) => c.id));
    expect(game.view('b').myHand.map((c) => c.id)).toEqual(cHand.map((c) => c.id));
  });
});

describe('UNO Flip', () => {
  const flipped = (dark: CardFace) => card('red', 'flip', dark);

  it('Flip voltea la mesa: arriba queda la cara oscura y se juega con colores oscuros', () => {
    const flip = flipped({ color: 'teal', value: '4' });
    const bCard = card('green', '2', { color: 'teal', value: '9' });
    const { game, play } = rig([[flip, card('red', '1', { color: 'pink', value: '1' }), card('red', '2', { color: 'pink', value: '2' })], [bCard, card('green', '3', { color: 'orange', value: '3' })]], card('red', '5'), {
      flip: true,
    });
    play('a', flip);
    const view = game.view('b');
    expect(view.side).toBe('dark');
    expect(view.top).toMatchObject({ color: 'teal', value: '4' });
    expect(view.currentColor).toBe('teal');
    expect(view.myHand[0]).toMatchObject({ color: 'teal', value: '9' });
    expect(view.playable).toEqual([bCard.id]);
    expect(view.players.find((p) => p.id === 'a')?.backs).toEqual([
      { color: 'red', value: '1' },
      { color: 'red', value: '2' },
    ]);
  });

  it('si queda un comodín arriba, quien volteó elige un color del nuevo lado', () => {
    const flip = flipped({ color: 'wild', value: 'wild' });
    const { game, play } = rig([[flip, ...filler()], filler()], card('red', '5'), { flip: true });
    play('a', flip);
    expect(game.view('a').pending).toEqual({ kind: 'color', count: 0 });
    expect(() => game.action('a', { type: 'color', color: 'red' })).toThrow('Elige un color');
    game.action('a', { type: 'color', color: 'purple' });
    expect(game.view('b')).toMatchObject({ currentColor: 'purple', turnId: 'b' });
  });

  it('lado oscuro: +5, salta a todos y comodín roba-color', () => {
    const draw5 = card('red', '1', { color: 'pink', value: 'draw5' });
    const skipAll = card('red', '2', { color: 'pink', value: 'skipAll' });
    const wdc = card('red', '3', { color: 'wild', value: 'wildDrawColor' });
    const { game, cards, internals } = rig([[draw5, skipAll, wdc, ...filler()], filler(), filler()], card('red', '5'), { flip: true });
    internals.side = 'dark';
    internals.currentColor = 'pink';
    internals.currentValue = '7';
    game.action('a', { type: 'play', cardId: skipAll.id });
    expect(game.view('a').turnId).toBe('a');
    game.action('a', { type: 'play', cardId: draw5.id });
    expect(cards('b')).toBe(8);
    expect(game.view('a').turnId).toBe('c');
    // roba-color: el mazo (de abajo hacia arriba) tiene un naranja escondido tras dos rosas
    internals.current = 0;
    internals.drawPile = [card('red', '1', { color: 'pink', value: '1' }), card('red', '1', { color: 'orange', value: '1' }), card('red', '1', { color: 'pink', value: '2' }), card('red', '1', { color: 'pink', value: '3' })];
    game.action('a', { type: 'play', cardId: wdc.id, color: 'orange' });
    expect(cards('b')).toBe(8 + 3);
  });
});
