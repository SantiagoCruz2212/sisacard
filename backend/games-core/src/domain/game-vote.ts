import type { GameId } from './game.js';
import { DomainError, type Player } from './shared.js';

export type VoteStatus = 'open' | 'closed';

/** Votación en el lobby para decidir a qué se juega. Los votos son públicos y se pueden cambiar mientras esté abierta. */
export class GameVote {
  status: VoteStatus = 'open';
  winner: GameId | null = null;
  roomId: string | null = null;
  private ballots = new Map<string, { player: Player; game: GameId }>();

  constructor(
    readonly id: string,
    readonly startedBy: Player,
    readonly options: GameId[],
    readonly deadline: number,
  ) {}

  cast(player: Player, game: unknown) {
    if (this.status !== 'open') throw new DomainError('La votación ya terminó');
    if (!this.options.includes(game as GameId)) throw new DomainError('Juego inválido');
    this.ballots.set(player.id, { player, game: game as GameId });
  }

  hasVoted(userId: string) {
    return this.ballots.has(userId);
  }

  voteOf(userId: string): GameId | null {
    return this.ballots.get(userId)?.game ?? null;
  }

  voters() {
    return [...this.ballots.values()].map(({ player, game }) => ({ userId: player.id, username: player.username, game }));
  }

  votersFor(game: GameId): Player[] {
    return [...this.ballots.values()].filter((b) => b.game === game).map((b) => b.player);
  }

  tally(): Record<GameId, number> {
    const tally = Object.fromEntries(this.options.map((o) => [o, 0])) as Record<GameId, number>;
    for (const { game } of this.ballots.values()) tally[game]++;
    return tally;
  }

  /** Cierra la votación. Gana el más votado; si hay empate se sortea entre los empatados. Sin votos no hay ganador. */
  close(random: () => number = Math.random): GameId | null {
    this.status = 'closed';
    const tally = this.tally();
    const max = Math.max(0, ...Object.values(tally));
    if (max === 0) return null;
    const top = this.options.filter((o) => tally[o] === max);
    this.winner = top[Math.floor(random() * top.length)] ?? null;
    return this.winner;
  }
}
