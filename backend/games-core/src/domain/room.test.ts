import { describe, expect, it } from 'vitest';
import { defaultAvatar, parseAvatar } from './avatar.js';
import { FakeScheduler } from './fake-scheduler.js';
import { GAMES } from './games.js';
import { DEFAULT_TIMINGS } from './impostor/impostor-game.js';
import { Room } from './room.js';

const ids = ['a', 'b', 'c', 'd'];
const player = (id: string) => ({ id, username: id.toUpperCase() });
const online = () => true;

type ImpostorSeen = { role: string; word: string | null };
const seenBy = (room: Room, id: string) => room.match?.view(id) as unknown as ImpostorSeen;

/** Sala de Impostor con a, b y c jugando. */
function playingRoom() {
  const scheduler = new FakeScheduler();
  const room = new Room('R1', player('a'), GAMES.impostor);
  room.join(player('b'));
  room.join(player('c'));
  room.start('a', online, (players) =>
    GAMES.impostor.create(players, { isOnline: online, scheduler, speed: 1, onChange: () => {}, onFinished: () => {} }),
  );
  return { room, scheduler };
}

describe('espectadores', () => {
  it('quien entra con la partida empezada queda como espectador', () => {
    const { room } = playingRoom();
    room.join(player('d'));
    expect(room.isSpectator('d')).toBe(true);
    expect(room.players.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(room.has('d')).toBe(true);
    expect(room.participants).toHaveLength(4);
  });

  it('en la sala de espera entra como jugador, no como espectador', () => {
    const room = new Room('R2', player('a'), GAMES.impostor);
    room.join(player('b'));
    expect(room.spectators).toHaveLength(0);
    expect(room.players).toHaveLength(2);
  });

  it('el espectador no puede actuar en la partida', () => {
    const { room } = playingRoom();
    room.join(player('d'));
    expect(() => room.match?.action('d', { type: 'vote', target: 'a' })).toThrow('No estás en la partida');
  });

  it('en Impostor el espectador no ve la palabra ni el rol, salvo al terminar', () => {
    const { room } = playingRoom();
    room.join(player('d'));
    const view = seenBy(room, 'd');
    expect(view.role).toBe('spectator');
    expect(view.word).toBeNull();
    const crewMember = ids.slice(0, 3).find((id) => seenBy(room, id).role === 'crew') as string;
    expect(seenBy(room, crewMember).word).toBeTruthy();
  });

  it('al salir, el espectador no afecta a los jugadores', () => {
    const { room } = playingRoom();
    room.join(player('d'));
    room.leave('d', online);
    expect(room.spectators).toHaveLength(0);
    expect(room.players).toHaveLength(3);
    expect(room.hostId).toBe('a');
  });

  it('en la revancha los espectadores conectados pasan a ser jugadores', () => {
    const scheduler = new FakeScheduler();
    const room = new Room('R3', player('a'), GAMES.uno);
    room.join(player('b'));
    room.start('a', online, (players) =>
      GAMES.uno.create(players, { isOnline: online, scheduler, speed: 1, onChange: () => {}, onFinished: () => {} }),
    );
    room.join(player('c'));
    room.join(player('d'));
    room.leave('b', online); // queda un solo jugador: la partida termina
    expect(room.match?.isFinished()).toBe(true);
    room.rematch('a', (id) => id !== 'd'); // d está desconectado
    expect(room.status).toBe('waiting');
    expect(room.players.map((p) => p.id)).toEqual(['a', 'c']);
    expect(room.spectators).toHaveLength(0);
  });

  it('limita la cantidad de espectadores', () => {
    const { room } = playingRoom();
    for (let i = 0; i < Room.MAX_SPECTATORS; i++) room.join(player(`s${i}`));
    expect(() => room.join(player('extra'))).toThrow('demasiados espectadores');
  });
});

describe('personaje', () => {
  const valid = { hair: 'bob', hairColor: 1, skin: 2, eyes: 'angry', eyeColor: 0, mouth: 'grin', clothes: 'vest', clothesColor: 3 };

  it('acepta un personaje válido', () => {
    expect(parseAvatar(valid)).toEqual(valid);
  });

  it.each([
    ['estilo de pelo desconocido', { ...valid, hair: 'mohicano' }],
    ['color fuera de la paleta', { ...valid, skin: 99 }],
    ['color con decimales', { ...valid, hairColor: 1.5 }],
    ['color como texto', { ...valid, eyeColor: '1' }],
    ['cuerpo vacío', undefined],
  ])('rechaza %s', (_label, input) => {
    expect(() => parseAvatar(input)).toThrow('Personaje inválido');
  });

  it('el personaje por defecto es siempre el mismo para un usuario y es válido', () => {
    expect(defaultAvatar('usuario-1')).toEqual(defaultAvatar('usuario-1'));
    expect(parseAvatar(defaultAvatar('usuario-2'))).toEqual(defaultAvatar('usuario-2'));
  });

  it('usuarios distintos suelen tener personajes distintos', () => {
    const distinct = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(defaultAvatar(`u${i}`))));
    expect(distinct.size).toBeGreaterThan(10);
  });
});

// Evita que el linter de imports elimine la constante usada solo para documentar la velocidad por defecto.
void DEFAULT_TIMINGS;
