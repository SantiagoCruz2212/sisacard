import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { WalletRepository } from '../application/ports.js';

/** Monedas y compras en games_db. Las compras descuentan y registran dentro de una transacción. */
export class SqliteWalletRepository implements WalletRepository {
  private db: DatabaseSync;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        user_id TEXT PRIMARY KEY,
        coins INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS xp (
        user_id TEXT PRIMARY KEY,
        xp INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS purchases (
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        bought_at TEXT NOT NULL,
        PRIMARY KEY (user_id, item_id)
      );
    `);
  }

  balance(userId: string) {
    const row = this.db.prepare('SELECT coins FROM wallets WHERE user_id = ?').get(userId) as { coins: number } | undefined;
    return row?.coins ?? 0;
  }

  credit(userId: string, amount: number) {
    if (amount <= 0) return;
    this.db
      .prepare('INSERT INTO wallets (user_id, coins) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET coins = coins + excluded.coins')
      .run(userId, amount);
  }

  xp(userId: string) {
    const row = this.db.prepare('SELECT xp FROM xp WHERE user_id = ?').get(userId) as { xp: number } | undefined;
    return row?.xp ?? 0;
  }

  addXp(userId: string, amount: number) {
    if (amount <= 0) return;
    this.db
      .prepare('INSERT INTO xp (user_id, xp) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET xp = xp + excluded.xp')
      .run(userId, amount);
  }

  owned(userId: string) {
    const rows = this.db.prepare('SELECT item_id FROM purchases WHERE user_id = ?').all(userId) as { item_id: string }[];
    return rows.map((r) => r.item_id);
  }

  purchase(userId: string, itemId: string, price: number) {
    this.db.exec('BEGIN');
    try {
      const paid = this.db.prepare('UPDATE wallets SET coins = coins - ? WHERE user_id = ? AND coins >= ?').run(price, userId, price);
      if (Number(paid.changes) === 0) {
        this.db.exec('ROLLBACK');
        return false;
      }
      this.db.prepare('INSERT INTO purchases (user_id, item_id, bought_at) VALUES (?, ?, ?)').run(userId, itemId, new Date().toISOString());
      this.db.exec('COMMIT');
      return true;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
