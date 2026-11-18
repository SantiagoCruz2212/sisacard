import express, { type Request, type RequestHandler } from 'express';
import { identityFromHeaders } from '@sisacard/contracts';
import { DomainError } from '../domain/errors.js';
import type { GetCurrentUser, LoginUser, RegisterUser } from '../application/use-cases.js';

interface Deps {
  register: RegisterUser;
  login: LoginUser;
  getCurrentUser: GetCurrentUser;
  gatewaySecret: string;
}

/** Adaptador de entrada HTTP. Solo traduce HTTP ↔ casos de uso. */
export function createHttpApp({ register, login, getCurrentUser, gatewaySecret }: Deps) {
  const app = express();
  app.use(express.json());

  const handle =
    (fn: (req: Request) => Promise<unknown>): RequestHandler =>
    async (req, res) => {
      try {
        res.json(await fn(req));
      } catch (e) {
        if (e instanceof DomainError) return void res.status(e.status).json({ error: e.message });
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
      }
    };

  app.get('/health', (_req, res) => void res.json({ service: 'auth-service', ok: true }));
  app.post('/register', handle((req) => register.execute({ username: req.body?.username, pin: req.body?.pin })));
  app.post('/login', handle((req) => login.execute({ username: req.body?.username, pin: req.body?.pin })));
  app.get(
    '/me',
    handle(async (req) => {
      const identity = identityFromHeaders(req.headers, gatewaySecret);
      if (!identity) throw new DomainError('No autorizado', 401);
      return { user: await getCurrentUser.execute(identity.id) };
    }),
  );
  return app;
}
