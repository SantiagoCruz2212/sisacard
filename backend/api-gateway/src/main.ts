// api-gateway: única puerta de entrada. Enruta, limita peticiones, valida el JWT e inyecta la identidad.
// (En el plan de microservicios este rol lo cumple Kong; aquí es un gateway liviano con el mismo contrato.)
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer, type IncomingMessage } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import {
  DEV_GATEWAY_SECRET,
  DEV_JWT_SECRET,
  HEADER_GATEWAY_SECRET,
  HEADER_USERNAME,
  HEADER_USER_ID,
  identityHeaders,
  verifyToken,
  type Identity,
} from '@sisacard/contracts';

const PORT = Number(process.env.PORT ?? 3001);
const AUTH_URL = process.env.AUTH_URL ?? 'http://localhost:3101';
const GAMES_URL = process.env.GAMES_URL ?? 'http://localhost:3102';
const JWT_SECRET = process.env.JWT_SECRET ?? DEV_JWT_SECRET;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET ?? DEV_GATEWAY_SECRET;

/** El token llega en Authorization (REST) o en ?token= (WebSocket, que no permite cabeceras en el navegador). */
function authenticate(req: IncomingMessage): Identity | null {
  const bearer = req.headers.authorization?.replace(/^Bearer /, '');
  const queryToken = new URL(req.url ?? '/', 'http://gateway').searchParams.get('token');
  const claims = verifyToken(bearer || queryToken || '', JWT_SECRET);
  return claims ? { id: claims.sub, username: claims.username } : null;
}

/** Nunca se confía en cabeceras de identidad que vengan del cliente. */
function stripIdentity(req: IncomingMessage) {
  delete req.headers[HEADER_USER_ID];
  delete req.headers[HEADER_USERNAME];
  delete req.headers[HEADER_GATEWAY_SECRET];
}

const inject = (req: IncomingMessage, identity: Identity) =>
  Object.assign(req.headers, identityHeaders(identity, GATEWAY_SECRET));

function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + windowMs });
    else if (++h.n > max) return void res.status(429).json({ error: 'Demasiadas peticiones' });
    next();
  };
}

const isPublic = (req: Request) =>
  req.method === 'POST' && (req.path === '/api/auth/login' || req.path === '/api/auth/register');

const authProxy = createProxyMiddleware({
  target: AUTH_URL,
  pathFilter: '/api/auth',
  pathRewrite: { '^/api/auth': '' },
});
const gamesApiProxy = createProxyMiddleware({
  target: GAMES_URL,
  pathFilter: '/api/games',
  pathRewrite: { '^/api/games': '' },
});
const socketProxy = createProxyMiddleware({ target: GAMES_URL, pathFilter: '/socket.io', ws: true });

const app = express();
app.get('/health', (_req, res) => void res.json({ service: 'api-gateway', ok: true }));

app.use((req, _res, next) => {
  stripIdentity(req);
  next();
});
app.use('/api/auth/login', rateLimit(30, 60_000));
app.use('/api/auth/register', rateLimit(30, 60_000));
app.use((req, res, next) => {
  const protectedPath = req.path.startsWith('/api/') || req.path.startsWith('/socket.io');
  if (!protectedPath || isPublic(req)) return next();
  const identity = authenticate(req);
  if (!identity) return void res.status(401).json({ error: 'No autorizado' });
  inject(req, identity);
  next();
});

app.use(authProxy);
app.use(gamesApiProxy);
app.use(socketProxy);
app.use('/api', (_req, res) => void res.status(404).json({ error: 'Ruta no encontrada' }));

// Si el frontend está compilado (npm run build), el gateway también lo sirve en el mismo puerto.
const dist = fileURLToPath(new URL('../../../frontend/dist/', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((_req, res) => void res.sendFile(dist + 'index.html'));
}

const server = createServer(app);
server.on('upgrade', (req, socket, head) => {
  stripIdentity(req);
  const identity = req.url?.startsWith('/socket.io') ? authenticate(req) : null;
  if (!identity) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return void socket.destroy();
  }
  inject(req, identity);
  socketProxy.upgrade?.(req, socket as never, head);
});

server.listen(PORT, '0.0.0.0', () => console.log(`api-gateway en http://0.0.0.0:${PORT}`));
