import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TokenClaims {
  sub: string;
  username: string;
  exp: number;
}

const b64 = (v: string) => Buffer.from(v).toString('base64url');
const sign = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest();

export function signToken(claims: Omit<TokenClaims, 'exp'>, secret: string, ttlSeconds = 7 * 24 * 3600): string {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${header}.${payload}.${sign(`${header}.${payload}`, secret).toString('base64url')}`;
}

export function verifyToken(token: string, secret: string): TokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  const expected = sign(`${header}.${payload}`, secret);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Partial<TokenClaims>;
    if (typeof c.sub !== 'string' || typeof c.username !== 'string' || typeof c.exp !== 'number') return null;
    if (c.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: c.sub, username: c.username, exp: c.exp };
  } catch {
    return null;
  }
}
