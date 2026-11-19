import express, { type Request, type RequestHandler } from 'express';
import { identityFromHeaders } from '@sisacard/contracts';
import { DomainError } from '../domain/shared.js';
import type { BuyItem, GetAvatar, GetLeaderboard, GetPlayerStats, GetShop, UpdateAvatar } from '../application/use-cases.js';

interface Deps {
  getStats: GetPlayerStats;
  getLeaderboard: GetLeaderboard;
  getAvatar: GetAvatar;
  updateAvatar: UpdateAvatar;
  getShop: GetShop;
  buyItem: BuyItem;
  gatewaySecret: string;
}

export function createHttpApp({ getStats, getLeaderboard, getAvatar, updateAvatar, getShop, buyItem, gatewaySecret }: Deps) {
  const app = express();
  app.use(express.json());

  /** Exige la identidad que valida el api-gateway y traduce errores de dominio a HTTP. */
  const authed =
    (fn: (req: Request, userId: string) => unknown | Promise<unknown>): RequestHandler =>
    async (req, res) => {
      const identity = identityFromHeaders(req.headers, gatewaySecret);
      if (!identity) return void res.status(401).json({ error: 'No autorizado' });
      try {
        res.json(await fn(req, identity.id));
      } catch (e) {
        if (e instanceof DomainError) return void res.status(e.status).json({ error: e.message });
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
      }
    };

  app.get('/health', (_req, res) => void res.json({ service: 'games-core', ok: true }));
  app.get('/stats/me', authed(async (_req, userId) => ({ stats: await getStats.execute(userId) })));
  app.get(
    '/leaderboard',
    authed(async (req) => ({
      entries: await getLeaderboard.execute(typeof req.query.game === 'string' ? req.query.game : undefined),
    })),
  );
  app.get('/avatar/me', authed((_req, userId) => ({ avatar: getAvatar.execute(userId) })));
  app.put('/avatar/me', authed((req, userId) => ({ avatar: updateAvatar.execute(userId, req.body) })));
  app.get('/shop/me', authed((_req, userId) => getShop.execute(userId)));
  app.post('/shop/buy', authed((req, userId) => buyItem.execute(userId, req.body?.itemId)));

  return app;
}
