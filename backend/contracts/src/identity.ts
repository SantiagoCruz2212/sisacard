import type { IncomingHttpHeaders } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

/**
 * Contrato gateway → servicios: el gateway valida el JWT y reenvía la identidad en estas cabeceras.
 * Los servicios solo las aceptan si traen el secreto compartido del gateway.
 */
export const HEADER_USER_ID = 'x-user-id';
export const HEADER_USERNAME = 'x-username';
export const HEADER_GATEWAY_SECRET = 'x-gateway-secret';

export interface Identity {
  id: string;
  username: string;
}

export const DEV_GATEWAY_SECRET = 'dev-gateway-secret-change-me';
export const DEV_JWT_SECRET = 'dev-jwt-secret-change-me';

export function identityHeaders(identity: Identity, gatewaySecret: string): Record<string, string> {
  return {
    [HEADER_USER_ID]: identity.id,
    // Los nombres pueden llevar tildes y las cabeceras HTTP no: se codifican.
    [HEADER_USERNAME]: encodeURIComponent(identity.username),
    [HEADER_GATEWAY_SECRET]: gatewaySecret,
  };
}

export function identityFromHeaders(headers: IncomingHttpHeaders, gatewaySecret: string): Identity | null {
  const secret = headers[HEADER_GATEWAY_SECRET];
  const id = headers[HEADER_USER_ID];
  const name = headers[HEADER_USERNAME];
  if (typeof secret !== 'string' || typeof id !== 'string' || typeof name !== 'string') return null;
  const a = Buffer.from(secret);
  const b = Buffer.from(gatewaySecret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return { id, username: decodeURIComponent(name) };
  } catch {
    return null;
  }
}
