import type { GameFinished } from '../domain/events.js';
import { pointsForPlace } from '../domain/scoring.js';
import type { StatsRepository } from './ports.js';

/**
 * Manejador del evento game.finished: convierte el resultado de una partida en estadísticas y puntos.
 * El 1.º lugar cuenta como victoria; los puntos dependen de la posición (ver domain/scoring.ts).
 */
export class RecordGameStats {
  constructor(private stats: StatsRepository) {}

  async handle(event: GameFinished) {
    const total = event.results.length;
    for (const r of event.results) {
      const name = event.players.find((p) => p.id === r.userId)?.username;
      if (name) await this.stats.rememberPlayer(r.userId, name);
      const counters = ['played', ...(r.place === 1 ? ['wins'] : []), ...r.extraStats];
      for (const stat of counters) await this.stats.increment(r.userId, event.game, stat, 1);
      await this.stats.increment(r.userId, event.game, 'points', pointsForPlace(r.place, total));
    }
  }
}
