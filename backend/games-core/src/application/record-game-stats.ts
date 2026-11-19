import type { GameFinished } from '../domain/events.js';
import { pointsForPlace } from '../domain/scoring.js';
import { WIN_BONUS_COINS } from '../domain/shop.js';
import type { StatsRepository, WalletRepository } from './ports.js';

/**
 * Manejador del evento game.finished: convierte el resultado de una partida en estadísticas, puntos y monedas.
 * El 1.º lugar cuenta como victoria; los puntos dependen de la posición (ver domain/scoring.ts).
 */
export class RecordGameStats {
  constructor(
    private stats: StatsRepository,
    private wallet: WalletRepository,
  ) {}

  async handle(event: GameFinished) {
    const total = event.results.length;
    for (const r of event.results) {
      const name = event.players.find((p) => p.id === r.userId)?.username;
      if (name) await this.stats.rememberPlayer(r.userId, name);
      const counters = ['played', ...(r.place === 1 ? ['wins'] : []), ...r.extraStats];
      for (const stat of counters) await this.stats.increment(r.userId, event.game, stat, 1);
      const points = pointsForPlace(r.place, total);
      await this.stats.increment(r.userId, event.game, 'points', points);
      // Monedas: los mismos puntos de la partida y un extra por ganar.
      this.wallet.credit(r.userId, points + (r.place === 1 && total > 1 ? WIN_BONUS_COINS : 0));
    }
  }
}
