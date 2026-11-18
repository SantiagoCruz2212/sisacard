import { describe, expect, it } from 'vitest';
import { DomainError, TooManyAttemptsError } from '../domain/errors.js';
import type { User } from '../domain/user.js';
import { InMemoryLoginThrottle, ScryptPinHasher } from '../infrastructure/security.js';
import type { TokenIssuer, UserRepository } from './ports.js';
import { LoginUser, RegisterUser } from './use-cases.js';

// Los casos de uso se prueban con adaptadores falsos: sin HTTP ni base de datos.
class FakeUsers implements UserRepository {
  items: User[] = [];
  async findByUsername(u: string) {
    return this.items.find((x) => x.username.toLowerCase() === u.toLowerCase()) ?? null;
  }
  async findById(id: string) {
    return this.items.find((x) => x.id === id) ?? null;
  }
  async save(user: User) {
    this.items.push(user);
  }
}
const tokens: TokenIssuer = { issue: (u) => `token-for-${u.username}` };

function setup() {
  const users = new FakeUsers();
  const hasher = new ScryptPinHasher();
  return {
    users,
    register: new RegisterUser(users, hasher, tokens),
    login: new LoginUser(users, hasher, tokens, new InMemoryLoginThrottle(3, 60_000)),
  };
}

describe('auth use cases', () => {
  it('registra un usuario sin guardar el PIN en claro', async () => {
    const { register, users } = setup();
    const res = await register.execute({ username: 'Santi', pin: '1234' });
    expect(res.token).toBe('token-for-Santi');
    expect(users.items[0]?.pinHash).not.toContain('1234');
    expect(users.items[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rechaza usuarios duplicados sin distinguir mayúsculas', async () => {
    const { register } = setup();
    await register.execute({ username: 'Santi', pin: '1234' });
    await expect(register.execute({ username: 'santi', pin: '4321' })).rejects.toMatchObject({ status: 409 });
  });

  it('valida usuario y PIN', async () => {
    const { register } = setup();
    await expect(register.execute({ username: 'a', pin: '1234' })).rejects.toBeInstanceOf(DomainError);
    await expect(register.execute({ username: 'ana', pin: '12' })).rejects.toBeInstanceOf(DomainError);
  });

  it('inicia sesión con el PIN correcto y falla con el incorrecto', async () => {
    const { register, login } = setup();
    await register.execute({ username: 'ana', pin: '1234' });
    expect((await login.execute({ username: 'ana', pin: '1234' })).user.username).toBe('ana');
    await expect(login.execute({ username: 'ana', pin: '9999' })).rejects.toMatchObject({ status: 401 });
  });

  it('bloquea tras demasiados intentos fallidos, incluso con el PIN correcto', async () => {
    const { register, login } = setup();
    await register.execute({ username: 'ana', pin: '1234' });
    for (let i = 0; i < 3; i++) await login.execute({ username: 'ana', pin: '0000' }).catch(() => undefined);
    await expect(login.execute({ username: 'ana', pin: '1234' })).rejects.toBeInstanceOf(TooManyAttemptsError);
  });
});
