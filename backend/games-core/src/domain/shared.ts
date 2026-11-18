import { randomUUID } from 'node:crypto';

export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export interface Player {
  id: string;
  username: string;
}

/** Puerto de tiempo: el dominio no usa setTimeout/Date directamente, así se prueba sin esperar. */
export interface Scheduler {
  now(): number;
  /** Ejecuta fn tras ms milisegundos. Devuelve la función para cancelarlo. */
  after(ms: number, fn: () => void): () => void;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  ts: number;
}

export function createChatMessage(author: Player, rawText: unknown, now: number): ChatMessage {
  const text = String(rawText ?? '').trim().slice(0, 300);
  if (!text) throw new DomainError('Mensaje vacío');
  return { id: randomUUID(), userId: author.id, username: author.username, text, ts: now };
}
