import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LeaderboardEntry, PlayerStats, StatsRepository } from '../application/ports.js';

/** Adaptador de persistencia (games_db). Contadores genéricos: cada juego nuevo define sus propias claves. */
export class SqliteStatsRepository implements StatsRepository {
  private db: DatabaseSync;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    // user_id es una referencia lógica a auth_db (sin FK entre bases de datos).
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_stats (
        user_id TEXT NOT NULL,
        game TEXT NOT NULL,
        stat TEXT NOT NULL,
        value INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, game, stat)
      );
      -- Nombre visible por jugador, para la tabla de clasificación (auth-service es el dueño real del nombre).
      CREATE TABLE IF NOT EXISTS players (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  async increment(userId: string, game: string, stat: string, by: number) {
    this.db
      .prepare(
        `INSERT INTO game_stats (user_id, game, stat, value, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, game, stat) DO UPDATE SET value = value + excluded.value, updated_at = excluded.updated_at`,
      )
      .run(userId, game, stat, by, new Date().toISOString());
  }

  async findByUser(userId: string) {
    const rows = this.db
      .prepare('SELECT game, stat, value FROM game_stats WHERE user_id = ?')
      .all(userId) as { game: string; stat: string; value: number }[];
    const out: PlayerStats = {};
    for (const r of rows) (out[r.game] ??= {})[r.stat] = r.value;
    return out;
  }

  async rememberPlayer(userId: string, username: string) {
    this.db
      .prepare(
        `INSERT INTO players (user_id, username, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, updated_at = excluded.updated_at`,
      )
      .run(userId, username, new Date().toISOString());
  }

  async leaderboard(game: string | undefined, limit: number) {
    const rows = this.db
      .prepare(
        `SELECT s.user_id AS userId, COALESCE(p.username, '?') AS username,
                SUM(CASE WHEN s.stat = 'points' THEN s.value ELSE 0 END) AS points,
                SUM(CASE WHEN s.stat = 'played' THEN s.value ELSE 0 END) AS played,
                SUM(CASE WHEN s.stat = 'wins' THEN s.value ELSE 0 END) AS wins
         FROM game_stats s LEFT JOIN players p ON p.user_id = s.user_id
         WHERE (? IS NULL OR s.game = ?)
         GROUP BY s.user_id
         HAVING points > 0
         ORDER BY points DESC, wins DESC, played ASC
         LIMIT ?`,
      )
      .all(game ?? null, game ?? null, limit) as unknown as LeaderboardEntry[];
    return rows;
  }
}
