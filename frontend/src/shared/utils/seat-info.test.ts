import { describe, expect, it } from 'vitest';
import type { ImpostorView, UnoView } from '@/shared/models/realtime';
import { deadPlayerIds } from '@/shared/utils/seat-info';

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
