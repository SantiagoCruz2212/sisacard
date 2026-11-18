import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AvatarDirectory } from '../application/ports.js';
import { defaultAvatar, parseAvatar, type Avatar } from '../domain/avatar.js';

/**
 * Personajes guardados en games_db. Se cargan en memoria al arrancar (son pocos y se leen en cada
 * actualización de sala), por eso el puerto es síncrono; las escrituras van a disco y a memoria.
 */
export class SqliteAvatarDirectory implements AvatarDirectory {
  private db: DatabaseSync;
  private cache = new Map<string, Avatar>();

  constructor(file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS avatars (
        user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const rows = this.db.prepare('SELECT user_id, data FROM avatars').all() as { user_id: string; data: string }[];
    for (const r of rows) {
      try {
        this.cache.set(r.user_id, parseAvatar(JSON.parse(r.data)));
      } catch {
        /* personaje corrupto: se usa el de por defecto */
      }
    }
  }

  get(userId: string): Avatar {
    return this.cache.get(userId) ?? defaultAvatar(userId);
  }

  set(userId: string, avatar: Avatar) {
    this.db
      .prepare(
        `INSERT INTO avatars (user_id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
      .run(userId, JSON.stringify(avatar), new Date().toISOString());
    this.cache.set(userId, avatar);
  }
}
