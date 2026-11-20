import { describe, expect, it } from 'vitest';
import type { BlackjackPlayer, BlackjackView, ImpostorView, UnoView } from '@/shared/models/realtime';
import { activePlayerId, deadPlayerIds, seatInfo } from '@/shared/utils/seat-info';

const seat = (id: string, out = false, left = false) => ({ id, username: id, out, left, connected: true, voted: false });

const impostor = (patch: Partial<ImpostorView>): ImpostorView => ({
  type: 'impostor',
  phase: 'voting',
  round: 1,
  deadline: 0,
  now: 0,
  category: 'x',
  role: 'crew',
  word: 'w',
  players: [seat('a'), seat('b'), seat('c')],
  turnId: null,
  clues: [],
  result: null,
  guesserId: null,
  guess: null,
  winner: null,
  results: null,
  reveal: null,
  ...patch,
});

const uno = (patch: Partial<UnoView>): UnoView => ({
  type: 'uno',
  phase: 'playing',
  deadline: 0,
  now: 0,
  players: [],
  myHand: [],
  playable: [],
  top: null,
  currentColor: 'red',
  currentValue: '0',
  settings: { infinity: false, flip: false, stacking: false, challenge: false, sevenZero: false, jumpIn: false, catchUno: false },
  side: 'light',
  deckBack: null,
  penalty: null,
  pending: null,
  choosingId: null,
  reveal: null,
  turnId: null,
  direction: 1,
  drawCount: 0,
  canDraw: false,
  canPass: false,
  log: [],
  results: null,
  ...patch,
});

describe('deadPlayerIds', () => {
  it('sin partida no hay muertos', () => {
    expect(deadPlayerIds(null).size).toBe(0);
  });

  it('Impostor: el eliminado por votación está muerto', () => {
    const play = impostor({ players: [seat('a'), seat('b', true), seat('c')] });
    expect([...deadPlayerIds(play)]).toEqual(['b']);
  });

  it('Impostor: quien se fue de la sala no cuenta como muerto', () => {
    const play = impostor({ players: [seat('a'), seat('b', true, true), seat('c')] });
    expect(deadPlayerIds(play).size).toBe(0);
  });

  it('Impostor: si ganan los tripulantes pierde el impostor', () => {
    const play = impostor({ phase: 'ended', winner: 'crew', reveal: { word: 'w', impostors: ['c'] } });
    expect([...deadPlayerIds(play)]).toEqual(['c']);
  });

  it('Impostor: si gana el impostor pierden todos los tripulantes', () => {
    const play = impostor({ phase: 'ended', winner: 'impostor', reveal: { word: 'w', impostors: ['c'] } });
    expect([...deadPlayerIds(play)].sort()).toEqual(['a', 'b']);
  });

  it('UNO: solo al terminar, y es quien queda en último lugar', () => {
    const results = [
      { userId: 'a', place: 1, points: 10 },
      { userId: 'b', place: 2, points: 7 },
      { userId: 'c', place: 3, points: 3 },
    ];
    expect(deadPlayerIds(uno({ phase: 'playing' })).size).toBe(0);
    expect([...deadPlayerIds(uno({ phase: 'ended', results }))]).toEqual(['c']);
  });
});

const bjPlayer = (id: string, patch: Partial<BlackjackPlayer> = {}): BlackjackPlayer => ({
  id,
  username: id,
  cards: [{ id: 1, rank: '9', suit: '♠' }],
  value: 9,
  soft: false,
  status: 'waiting',
  out: false,
  left: false,
  connected: true,
  roundValues: [],
  total: 0,
  ...patch,
});

const blackjack = (players: BlackjackPlayer[], turnId: string | null = null): BlackjackView => ({
  type: 'blackjack',
  phase: 'playing',
  round: 1,
  cycle: 1,
  target: 21,
  cutTarget: 42,
  deadline: 0,
  now: 0,
  players,
  turnId,
  canHit: false,
  canStand: false,
  log: [],
  results: null,
});

describe('Blackjack en la mesa', () => {
  it('el turno activo es el del jugador que debe pedir o plantarse', () => {
    expect(activePlayerId(blackjack([bjPlayer('a'), bjPlayer('b')], 'b'))).toBe('b');
  });

  it('quien se pasa o sale en el corte cuenta como muerto; quien se fue no', () => {
    const play = blackjack([bjPlayer('a', { out: true, status: 'busted' }), bjPlayer('b', { out: true, status: 'out' }), bjPlayer('c', { out: true, left: true }), bjPlayer('d')]);
    expect([...deadPlayerIds(play)].sort()).toEqual(['a', 'b']);
  });

  it('el asiento muestra el valor de la mano, 💥 si se pasó y ✖ si salió', () => {
    const play = blackjack([bjPlayer('a', { value: 17 }), bjPlayer('b', { out: true, status: 'busted' }), bjPlayer('c', { out: true, status: 'out' })]);
    expect(seatInfo(play, 'a')).toEqual({ label: '17', dim: false });
    expect(seatInfo(play, 'b')).toEqual({ label: '💥', dim: true });
    expect(seatInfo(play, 'c')).toEqual({ label: '✖', dim: true });
  });
});
