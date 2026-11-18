import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { UserRepository } from '../application/ports.js';
import type { User } from '../domain/user.js';

interface Row {
  id: string;
  username: string;
  pin_hash: string;
  salt: string;
  created_at: string;
}

const toUser = (r: Row | undefined): User | null =>
  r ? { id: r.id, username: r.username, pinHash: r.pin_hash, salt: r.salt, createdAt: r.created_at } : null;

/** Adaptador de persistencia (auth_db). Cambiar a PostgreSQL solo implica otra clase que cumpla UserRepository. */
export class SqliteUserRepository implements UserRepository {
  private db: DatabaseSync;

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        pin_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  async findByUsername(username: string) {
    return toUser(this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Row | undefined);
  }

  async findById(id: string) {
    return toUser(this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined);
  }

  async save(user: User) {
    this.db
      .prepare('INSERT INTO users (id, username, pin_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, user.username, user.pinHash, user.salt, user.createdAt);
  }
}
