import { DomainError } from './errors.js';

export interface User {
  id: string;
  username: string;
  pinHash: string;
  salt: string;
  createdAt: string;
}

const USERNAME_RE = /^[\p{L}\p{N}_-]{2,16}$/u;
const PIN_RE = /^\d{4}$/;

export function parseUsername(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!USERNAME_RE.test(value)) throw new DomainError('El usuario debe tener entre 2 y 16 letras, números, _ o -');
  return value;
}

export function parsePin(raw: unknown): string {
  if (typeof raw !== 'string' || !PIN_RE.test(raw)) throw new DomainError('La contraseña son 4 números');
  return raw;
}
