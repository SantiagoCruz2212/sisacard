import { randomUUID } from 'node:crypto';
import { DomainError, InvalidCredentialsError } from '../domain/errors.js';
import { parsePin, parseUsername, type User } from '../domain/user.js';
import type { AuthResult, LoginThrottle, PinHasher, TokenIssuer, UserRepository } from './ports.js';

export class RegisterUser {
  constructor(
    private users: UserRepository,
    private hasher: PinHasher,
    private tokens: TokenIssuer,
  ) {}

  async execute(input: { username: unknown; pin: unknown }): Promise<AuthResult> {
    const username = parseUsername(input.username);
    const pin = parsePin(input.pin);
    if (await this.users.findByUsername(username)) throw new DomainError('Ese usuario ya existe', 409);
    const { hash, salt } = this.hasher.hash(pin);
    const user: User = { id: randomUUID(), username, pinHash: hash, salt, createdAt: new Date().toISOString() };
    await this.users.save(user);
    return { token: this.tokens.issue(user), user: { id: user.id, username } };
  }
}

export class LoginUser {
  constructor(
    private users: UserRepository,
    private hasher: PinHasher,
    private tokens: TokenIssuer,
    private throttle: LoginThrottle,
  ) {}

  async execute(input: { username: unknown; pin: unknown }): Promise<AuthResult> {
    const username = parseUsername(input.username);
    const pin = parsePin(input.pin);
    const key = username.toLowerCase();
    this.throttle.assertAllowed(key);
    const user = await this.users.findByUsername(username);
    if (!user || !this.hasher.verify(pin, user.pinHash, user.salt)) {
      this.throttle.recordFailure(key);
      throw new InvalidCredentialsError();
    }
    this.throttle.reset(key);
    return { token: this.tokens.issue(user), user: { id: user.id, username: user.username } };
  }
}

export class GetCurrentUser {
  constructor(private users: UserRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('Usuario no encontrado', 404);
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }
}
