// Composition root: único lugar donde se eligen las implementaciones concretas de los puertos.
import { fileURLToPath } from 'node:url';
import { DEV_GATEWAY_SECRET, DEV_JWT_SECRET } from '@sisacard/contracts';
import { GetCurrentUser, LoginUser, RegisterUser } from './application/use-cases.js';
import { createHttpApp } from './infrastructure/http-app.js';
import { InMemoryLoginThrottle, JwtTokenIssuer, ScryptPinHasher } from './infrastructure/security.js';
import { SqliteUserRepository } from './infrastructure/sqlite-user-repository.js';

const PORT = Number(process.env.AUTH_PORT ?? 3101);
const dataDir = process.env.DATA_DIR ?? fileURLToPath(new URL('../data/', import.meta.url));

const users = new SqliteUserRepository(`${dataDir.replace(/[\\/]+$/, '')}/auth.db`);
const hasher = new ScryptPinHasher();
const tokens = new JwtTokenIssuer(process.env.JWT_SECRET ?? DEV_JWT_SECRET);

const app = createHttpApp({
  register: new RegisterUser(users, hasher, tokens),
  login: new LoginUser(users, hasher, tokens, new InMemoryLoginThrottle()),
  getCurrentUser: new GetCurrentUser(users),
  gatewaySecret: process.env.GATEWAY_SECRET ?? DEV_GATEWAY_SECRET,
});

app.listen(PORT, () => console.log(`auth-service en :${PORT}`));
