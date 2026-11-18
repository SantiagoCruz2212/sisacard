import type { User } from '../domain/user.js';

// Puertos de salida: el dominio y los casos de uso solo conocen estas interfaces.
export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface PinHasher {
  hash(pin: string): { hash: string; salt: string };
  verify(pin: string, hash: string, salt: string): boolean;
}

export interface TokenIssuer {
  issue(user: { id: string; username: string }): string;
}

/** Un PIN de 4 dígitos es fácil de adivinar: se limitan los intentos por usuario. */
export interface LoginThrottle {
  assertAllowed(key: string): void;
  recordFailure(key: string): void;
  reset(key: string): void;
}

export interface AuthResult {
  token: string;
  user: { id: string; username: string };
}
