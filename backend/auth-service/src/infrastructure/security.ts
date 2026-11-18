import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { signToken } from '@sisacard/contracts';
import { TooManyAttemptsError } from '../domain/errors.js';
import type { LoginThrottle, PinHasher, TokenIssuer } from '../application/ports.js';

export class ScryptPinHasher implements PinHasher {
  hash(pin: string) {
    const salt = randomBytes(16).toString('hex');
    return { salt, hash: scryptSync(pin, salt, 32).toString('hex') };
  }

  verify(pin: string, hash: string, salt: string) {
    const given = scryptSync(pin, salt, 32);
    const stored = Buffer.from(hash, 'hex');
    return given.length === stored.length && timingSafeEqual(given, stored);
  }
}

export class JwtTokenIssuer implements TokenIssuer {
  constructor(private secret: string) {}

  issue(user: { id: string; username: string }) {
    return signToken({ sub: user.id, username: user.username }, this.secret);
  }
}

export class InMemoryLoginThrottle implements LoginThrottle {
  private state = new Map<string, { fails: number; lockedUntil: number }>();

  constructor(
    private maxFails = 5,
    private lockMs = 30_000,
  ) {}

  assertAllowed(key: string) {
    if ((this.state.get(key)?.lockedUntil ?? 0) > Date.now()) throw new TooManyAttemptsError();
  }

  recordFailure(key: string) {
    const fails = (this.state.get(key)?.fails ?? 0) + 1;
    this.state.set(
      key,
      fails >= this.maxFails ? { fails: 0, lockedUntil: Date.now() + this.lockMs } : { fails, lockedUntil: 0 },
    );
  }

  reset(key: string) {
    this.state.delete(key);
  }
}
