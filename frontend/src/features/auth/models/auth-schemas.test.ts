import { describe, expect, it } from 'vitest';
import { credentialsSchema } from '@/features/auth/models/auth-schemas';

describe('credentialsSchema', () => {
  it('acepta un usuario y un PIN de 4 dígitos', () => {
    expect(credentialsSchema.safeParse({ username: 'Santi_01', pin: '1234' }).success).toBe(true);
  });

  it('acepta tildes y eñes en el usuario', () => {
    expect(credentialsSchema.safeParse({ username: 'Ñandú', pin: '0000' }).success).toBe(true);
  });

  it.each([
    ['usuario muy corto', { username: 'a', pin: '1234' }],
    ['usuario con espacios internos', { username: 'ana maria', pin: '1234' }],
    ['PIN de 3 dígitos', { username: 'ana', pin: '123' }],
    ['PIN con letras', { username: 'ana', pin: '12ab' }],
  ])('rechaza %s', (_label, input) => {
    expect(credentialsSchema.safeParse(input).success).toBe(false);
  });

  it('devuelve claves i18n como mensaje de error', () => {
    const result = credentialsSchema.safeParse({ username: 'a', pin: '1' });
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages).toContain('auth.errors.username');
    expect(messages).toContain('auth.errors.pin');
  });
});
