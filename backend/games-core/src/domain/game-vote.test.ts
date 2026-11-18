import { describe, expect, it } from 'vitest';
import { GameVote } from './game-vote.js';

const ana = { id: 'a', username: 'Ana' };
const beto = { id: 'b', username: 'Beto' };
const cami = { id: 'c', username: 'Cami' };
const newVote = () => new GameVote('v1', ana, ['impostor', 'uno'], 1000);

describe('GameVote', () => {
  it('cuenta los votos y permite cambiar el voto', () => {
    const vote = newVote();
    vote.cast(ana, 'uno');
    vote.cast(beto, 'uno');
    vote.cast(cami, 'impostor');
    expect(vote.tally()).toEqual({ impostor: 1, uno: 2 });
    vote.cast(beto, 'impostor');
    expect(vote.tally()).toEqual({ impostor: 2, uno: 1 });
    expect(vote.voteOf('b')).toBe('impostor');
  });

  it('gana el más votado', () => {
    const vote = newVote();
    vote.cast(ana, 'uno');
    vote.cast(beto, 'uno');
    vote.cast(cami, 'impostor');
    expect(vote.close()).toBe('uno');
    expect(vote.votersFor('uno').map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('en caso de empate sortea entre los empatados', () => {
    const results = new Set<string | null>();
    for (const r of [0, 0.99]) {
      const vote = newVote();
      vote.cast(ana, 'uno');
      vote.cast(beto, 'impostor');
      results.add(vote.close(() => r));
    }
    expect(results).toEqual(new Set(['impostor', 'uno']));
  });

  it('sin votos no hay ganador', () => {
    const vote = newVote();
    expect(vote.close()).toBeNull();
    expect(vote.status).toBe('closed');
  });

  it('rechaza juegos inválidos y votos con la votación cerrada', () => {
    const vote = newVote();
    expect(() => vote.cast(ana, 'ajedrez')).toThrow('Juego inválido');
    vote.close();
    expect(() => vote.cast(ana, 'uno')).toThrow('ya terminó');
  });
});
