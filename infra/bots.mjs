// Bots de prueba para jugar contigo sin necesitar más personas.
// Uso: node infra/bots.mjs [cantidad=2] [impostor|uno]   (el servidor debe estar corriendo)
// El primer bot crea la sala y la inicia en cuanto entre un humano; todos juegan solos.
import { io } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const count = Number(process.argv[2] ?? 2);
const game = process.argv[3] === 'uno' ? 'uno' : 'impostor';
const suffix = Math.random().toString(36).slice(2, 5);
const WORDS = ['bonito', 'grande', 'rápido', 'común', 'antiguo', 'ruidoso', 'caliente', 'útil'];

async function login(name) {
  const body = JSON.stringify({ username: name, pin: '1234' });
  const headers = { 'Content-Type': 'application/json' };
  let r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers, body });
  if (!r.ok) r = await fetch(`${BASE}/api/auth/register`, { method: 'POST', headers, body });
  return r.json();
}

const bots = [];
for (let i = 0; i < count; i++) {
  const { token, user } = await login(`bot${i + 1}_${suffix}`);
  const sock = io(BASE, { query: { token } });
  const call = (ev, p = {}) => new Promise((res) => sock.emit(ev, p, res));
  const bot = { user, sock, call, started: false };
  let last = '';
  sock.on('room:state', async (room) => {
    if (!room) return;
    if (i === 0 && room.status === 'waiting' && room.players.length > count && !bot.started) {
      bot.started = true;
      console.log(`Entró un humano (${room.players.length} jugadores), empiezo en 3s…`);
      setTimeout(() => call('room:start'), 3000);
    }
    const v = room.play;
    if (!v) return bot.started && (bot.started = false);
    const key = `${v.phase}:${v.turnId}:${v.round}:${v.myVote}:${v.guesserId}:${v.myHand?.length}:${v.top?.id}:${v.canPass}`;
    if (key === last) return;
    last = key;
    const wait = () => new Promise((r) => setTimeout(r, 1000 + Math.random() * 2500));
    if (v.type === 'uno') {
      if (v.turnId !== user.id) return;
      await wait();
      const card = v.myHand.find((c) => c.id === v.playable[0]);
      if (card) call('game:action', { type: 'play', cardId: card.id, color: card.color === 'wild' ? 'blue' : undefined, uno: true });
      else if (v.canDraw) call('game:action', { type: 'draw' });
      else if (v.canPass) call('game:action', { type: 'pass' });
      return;
    }
    if (v.phase === 'clues' && v.turnId === user.id) {
      await wait();
      call('game:action', { type: 'clue', text: WORDS[Math.floor(Math.random() * WORDS.length)] });
    }
    if (v.phase === 'voting' && v.myVote === undefined) {
      await wait();
      const options = v.players.filter((p) => !p.out && p.id !== user.id);
      call('game:action', { type: 'vote', target: options[Math.floor(Math.random() * options.length)].id });
    }
    if (v.phase === 'guess' && v.guesserId === user.id) call('game:action', { type: 'guess', text: 'no sé' });
    if (v.phase === 'ended' && i === 0) setTimeout(() => call('room:rematch'), 6000);
  });
  bots.push(bot);
}

await new Promise((r) => setTimeout(r, 800));
const created = await bots[0].call('room:create', { game });
for (const b of bots.slice(1)) await b.call('room:join', { roomId: created.roomId });
console.log(`Sala de ${game} ${created.roomId} lista con ${count} bots. Entra desde el lobby con tu usuario.`);
