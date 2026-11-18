// Prueba de humo de punta a punta, SIEMPRE a través del api-gateway.
// Levanta los servicios con tiempos cortos (GAMES_FAST=1) y juega Impostor y UNO con 3 bots cada uno.
import { io } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const suffix = Math.random().toString(36).slice(2, 6);
let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? '✔' : '✘'} ${label}${extra !== '' ? ` → ${extra}` : ''}`);
  if (!ok) failures++;
};

const req = async (method, path, body, token, headers = {}) => {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

// ---- seguridad en el gateway ----
check('stats sin token → 401', (await req('GET', '/api/games/stats/me')).status === 401);
check('cabecera x-user-id falsificada no sirve', (await req('GET', '/api/games/stats/me', null, null, { 'x-user-id': 'x' })).status === 401);
check('pin inválido → 400', (await req('POST', '/api/auth/register', { username: 'abc', pin: '12' })).status === 400);

const bots = [];
for (const n of ['ana', 'beto', 'cami']) {
  const r = await req('POST', '/api/auth/register', { username: `${n}_${suffix}`, pin: '1234' });
  check(`registro ${n}`, r.status === 200 && r.data.token, r.data.user?.id);
  bots.push({ ...r.data, name: n });
}
check('usuario duplicado → 409', (await req('POST', '/api/auth/register', { username: `ana_${suffix}`, pin: '1234' })).status === 409);
check('login con pin malo → 401', (await req('POST', '/api/auth/login', { username: `ana_${suffix}`, pin: '9999' })).status === 401);
const login = await req('POST', '/api/auth/login', { username: `ana_${suffix}`, pin: '1234' });
check('login correcto', login.status === 200 && login.data.token);
check('/me con token', (await req('GET', '/api/auth/me', null, login.data.token)).data.user?.username === `ana_${suffix}`);
check('ruta inexistente → 404 con token', (await req('GET', '/api/nope', null, login.data.token)).status === 404);
check('token manipulado → 401', (await req('GET', '/api/auth/me', null, login.data.token.slice(0, -2) + 'xx')).status === 401);

await new Promise((resolve) => {
  const bad = io(BASE, { transports: ['websocket'], reconnection: false });
  bad.on('connect', () => {
    check('websocket sin token rechazado', false);
    bad.close();
    resolve();
  });
  bad.on('connect_error', () => {
    check('websocket sin token rechazado', true);
    bad.close();
    resolve();
  });
});

for (const b of bots) b.sock = io(BASE, { query: { token: b.token } });
await new Promise((r) => setTimeout(r, 500));
const call = (b, ev, p = {}) => new Promise((res) => b.sock.emit(ev, p, res));

/** Juega una partida completa con los bots y devuelve la vista final. */
async function playGame(game, strategy) {
  let leak = false;
  const finished = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout de ${game}`)), 90_000);
    bots.forEach((b, i) => {
      b.sock.removeAllListeners('room:state');
      let last = '';
      b.sock.on('room:state', async (room) => {
        const v = room?.play;
        if (!v || v.type !== game) return;
        if (v.type === 'impostor' && v.role === 'impostor' && v.phase !== 'ended' && v.word !== null) leak = true;
        if (v.phase === 'ended') {
          if (i === 0) {
            clearTimeout(timer);
            resolve(v);
          }
          return;
        }
        const key = JSON.stringify([v.phase, v.turnId, v.round, v.cycle, v.myVote, v.guesserId, v.myHand?.length, v.top?.id, v.canPass, v.players?.map((p) => `${p.cards?.length}${p.status}`).join()]);
        if (key === last) return;
        last = key;
        const action = strategy(v, b);
        if (action) await call(b, 'game:action', action);
      });
    });
  });

  await call(bots[0], 'room:leave');
  const created = await call(bots[0], 'room:create', { game });
  check(`crear sala de ${game}`, created.ok, created.roomId);
  for (const b of bots.slice(1)) check(`unirse ${b.name}`, (await call(b, 'room:join', { roomId: created.roomId })).ok);
  check('solo el anfitrión puede empezar', !(await call(bots[1], 'room:start')).ok);
  check(`empezar ${game}`, (await call(bots[0], 'room:start')).ok);
  const end = await finished;
  check(`${game} terminó`, end.phase === 'ended');
  await new Promise((r) => setTimeout(r, 300));
  for (const b of bots) await call(b, 'room:leave');
  return { end, leak };
}

// ---- Impostor ----
const impostorBot = (v, b) => {
  if (v.phase === 'clues' && v.turnId === b.user.id) return { type: 'clue', text: `pista-${b.name}` };
  if (v.phase === 'voting') return { type: 'vote', target: v.players.find((p) => !p.out && p.id !== b.user.id).id };
  if (v.phase === 'guess' && v.guesserId === b.user.id) return { type: 'guess', text: 'nose' };
};
const imp = await playGame('impostor', impostorBot);
check('impostor: la palabra no se filtró', !imp.leak);
check('impostor: hay posiciones y puntos', imp.end.results?.length === 3 && imp.end.results.every((r) => r.points >= 1));
check('impostor: el ganador cobra más que el perdedor', Math.max(...imp.end.results.map((r) => r.points)) > Math.min(...imp.end.results.map((r) => r.points)));

// ---- UNO ----
const unoBot = (v, b) => {
  if (v.turnId !== b.user.id) return;
  const hand = v.myHand;
  if (v.playable.length > 0) {
    const card = hand.find((c) => c.id === v.playable[0]);
    return { type: 'play', cardId: card.id, color: card.color === 'wild' ? 'red' : undefined, uno: true };
  }
  if (v.canDraw) return { type: 'draw' };
  if (v.canPass) return { type: 'pass' };
};
const uno = await playGame('uno', unoBot);
const places = uno.end.results.map((r) => r.place).sort();
check('uno: posiciones 1, 2 y 3', JSON.stringify(places) === '[1,2,3]', JSON.stringify(places));
check('uno: puntos decrecen con la posición', uno.end.results.sort((a, b) => a.place - b.place).map((r) => r.points).join() === '10,7,3');

// ---- Blackjack Royale ----
const blackjackBot = (v, b) => {
  if (v.turnId !== b.user.id) return;
  const me = v.players.find((p) => p.id === b.user.id);
  return { type: me.value < 17 ? 'hit' : 'stand' };
};
const bj = await playGame('blackjack', blackjackBot);
const bjPlaces = bj.end.results.map((r) => r.place);
check('blackjack: hay un único ganador', bjPlaces.filter((p) => p === 1).length === 1, JSON.stringify(bjPlaces));
check('blackjack: todos tienen posición y puntos', bj.end.results.length === 3 && bj.end.results.every((r) => r.points >= 1));
check('blackjack: el ganador cobra 10 puntos', bj.end.results.find((r) => r.place === 1)?.points === 10);

// ---- votación de juegos ----
const voteState = {};
for (const b of bots) {
  b.room = null;
  b.sock.removeAllListeners('room:state');
  b.sock.on('room:state', (r) => (b.room = r));
  b.sock.on('vote:state', (v) => (voteState[b.name] = v));
}
check('iniciar votación', (await call(bots[0], 'vote:start')).ok);
check('no se puede iniciar otra mientras hay una abierta', !(await call(bots[1], 'vote:start')).ok);
check('juego inválido rechazado', !(await call(bots[0], 'vote:cast', { game: 'ajedrez' })).ok);
await call(bots[0], 'vote:cast', { game: 'uno' });
await call(bots[1], 'vote:cast', { game: 'uno' });
await new Promise((r) => setTimeout(r, 200));
check('los votos se ven en vivo', voteState.cami?.tally?.uno === 2 && voteState.cami?.status === 'open');
await call(bots[2], 'vote:cast', { game: 'impostor' }); // vota el último: cierra antes de tiempo
await new Promise((r) => setTimeout(r, 400));
check('ganó UNO y se creó la sala', voteState.ana?.result?.winner === 'uno' && Boolean(voteState.ana?.result?.roomId), JSON.stringify(voteState.ana?.result));
check('quienes votaron UNO entraron a la sala', bots[0].room?.game === 'uno' && bots[1].room?.game === 'uno' && bots[0].room.players.length === 2);
check('el anfitrión es quien inició la votación', bots[0].room?.hostId === bots[0].user.id);
check('quien votó otro juego se queda en el lobby', bots[2].room === null);
check('vote:cast con la votación cerrada falla', !(await call(bots[2], 'vote:cast', { game: 'uno' })).ok);
for (const b of bots.slice(0, 2)) await call(b, 'room:leave');

// ---- clasificación y estadísticas ----
await new Promise((r) => setTimeout(r, 400));
// La base puede traer jugadores de corridas anteriores: solo se miran los de esta.
const mine = (entries) => entries.filter((e) => e.username.endsWith(`_${suffix}`));
const board = mine((await req('GET', '/api/games/leaderboard', null, bots[0].token)).data.entries);
check('clasificación general con los 3 jugadores', board.length >= 3 && board[0].points >= board[1].points, board.map((e) => `${e.username}:${e.points}`).join(' '));
const unoBoard = mine((await req('GET', '/api/games/leaderboard?game=uno', null, bots[0].token)).data.entries);
check('clasificación de UNO', unoBoard.length === 3 && unoBoard[0].points === 10, unoBoard.map((e) => `${e.username}:${e.points}`).join(' '));
check('leaderboard sin token → 401', (await req('GET', '/api/games/leaderboard')).status === 401);
const stats = (await req('GET', '/api/games/stats/me', null, bots[0].token)).data.stats;
check('estadísticas por juego', stats.impostor?.played === 1 && stats.uno?.played === 1 && stats.uno?.points >= 3, JSON.stringify(stats));

// ---- personaje y espectadores (al final: abandonar una partida a medias la termina y suma estadísticas) ----
const goodAvatar = {
  sex: 'female', hair: 'ponytail', hairColor: 1, skin: 2, eyes: 'wink', eyeColor: 0, mouth: 'smirk',
  clothes: 'dress', clothesColor: 3, hat: 'crown', hatColor: 4, glasses: 'round', beard: 'none', accessory: 'earring',
};
// Se compara sin importar el orden de las claves.
const canon = (o) => JSON.stringify(Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b))));
check('personaje inválido → 400', (await req('PUT', '/api/games/avatar/me', { ...goodAvatar, hair: 'mohicano' }, bots[0].token)).status === 400);
check('personaje con color fuera de paleta → 400', (await req('PUT', '/api/games/avatar/me', { ...goodAvatar, skin: 99 }, bots[0].token)).status === 400);
check('sexo inválido → 400', (await req('PUT', '/api/games/avatar/me', { ...goodAvatar, sex: 'otro' }, bots[0].token)).status === 400);
check('guardar personaje', (await req('PUT', '/api/games/avatar/me', goodAvatar, bots[0].token)).status === 200);
check('leer personaje guardado', canon((await req('GET', '/api/games/avatar/me', null, bots[0].token)).data.avatar) === canon(goodAvatar));
check('sin personaje guardado hay uno por defecto', Boolean((await req('GET', '/api/games/avatar/me', null, bots[1].token)).data.avatar?.sex));
check('personaje sin token → 401', (await req('PUT', '/api/games/avatar/me', goodAvatar)).status === 401);

// no binario: solo vehículo
const nb = await req('PUT', '/api/games/avatar/me', { sex: 'nonbinary', vehicle: 'motorcycle', hair: 'afro', hat: 'crown' }, bots[1].token);
check('no binario: se guarda solo el vehículo', nb.status === 200 && canon(nb.data.avatar) === canon({ sex: 'nonbinary', vehicle: 'motorcycle' }), canon(nb.data.avatar));
check('no binario: vehículo inválido → 400', (await req('PUT', '/api/games/avatar/me', { sex: 'nonbinary', vehicle: 'tanque' }, bots[1].token)).status === 400);
check('no binario: se puede cambiar al helicóptero Apache', (await req('PUT', '/api/games/avatar/me', { sex: 'nonbinary', vehicle: 'apache' }, bots[1].token)).data.avatar?.vehicle === 'apache');
check('mujer: la barba se descarta', (await req('PUT', '/api/games/avatar/me', { ...goodAvatar, beard: 'beard' }, bots[0].token)).data.avatar?.beard === 'none');
await req('PUT', '/api/games/avatar/me', goodAvatar, bots[0].token);

const created2 = await call(bots[0], 'room:create', { game: 'uno' });
await call(bots[1], 'room:join', { roomId: created2.roomId });
check('empezar UNO para espectar', (await call(bots[0], 'room:start')).ok);
const joinSpec = await call(bots[2], 'room:join', { roomId: created2.roomId });
check('entrar a una sala en partida como espectador', joinSpec.ok);
await new Promise((r) => setTimeout(r, 300));
check('el espectador figura en la sala', bots[2].room?.spectators?.some((x) => x.id === bots[2].user.id) && bots[2].room.players.length === 2);
check('los jugadores ven al espectador', bots[0].room?.spectators?.length === 1);
check('el espectador no ve cartas ajenas', Array.isArray(bots[2].room?.play?.myHand) && bots[2].room.play.myHand.length === 0);
check('el espectador no puede actuar', !(await call(bots[2], 'game:action', { type: 'draw' })).ok);
check('el personaje viaja con cada jugador de la mesa', canon(bots[2].room?.players?.find((x) => x.id === bots[0].user.id)?.avatar) === canon(goodAvatar));
check('un jugador no binario llega a la mesa como vehículo', bots[2].room?.players?.find((x) => x.id === bots[1].user.id)?.avatar?.vehicle === 'apache');
check('el espectador no puede entrar a otra sala', !(await call(bots[2], 'room:create', { game: 'impostor' })).ok);
await call(bots[2], 'room:leave');
await new Promise((r) => setTimeout(r, 200));
check('al irse el espectador, los jugadores siguen', bots[0].room?.spectators?.length === 0 && bots[0].room.players.length === 2);

bots.forEach((b) => b.sock.close());
console.log(failures ? `\n${failures} verificaciones fallaron` : '\nTodo OK');
process.exit(failures ? 1 : 0);
