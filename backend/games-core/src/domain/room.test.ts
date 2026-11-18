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
  const valid = {
    sex: 'female', hair: 'ponytail', hairColor: 1, skin: 2, eyes: 'wink', eyeColor: 0, mouth: 'smirk',
    clothes: 'dress', clothesColor: 3, hat: 'crown', hatColor: 4, glasses: 'round', beard: 'none', accessory: 'earring',
  };

  it('acepta un personaje humano válido', () => {
    expect(parseAvatar(valid)).toEqual(valid);
  });

  it('un hombre puede elegir barba; en una mujer se ignora', () => {
    expect(parseAvatar({ ...valid, sex: 'male', beard: 'goatee' })).toMatchObject({ sex: 'male', beard: 'goatee' });
    expect(parseAvatar({ ...valid, sex: 'female', beard: 'goatee' })).toMatchObject({ sex: 'female', beard: 'none' });
  });

  it('no binario: solo se elige un vehículo y todo lo demás se descarta', () => {
    expect(parseAvatar({ sex: 'nonbinary', vehicle: 'apache' })).toEqual({ sex: 'nonbinary', vehicle: 'apache' });
    expect(parseAvatar({ sex: 'nonbinary', vehicle: 'motorcycle', hair: 'afro', hat: 'crown' })).toEqual({ sex: 'nonbinary', vehicle: 'motorcycle' });
    expect(() => parseAvatar({ sex: 'nonbinary', vehicle: 'tanque' })).toThrow('Personaje inválido: vehicle');
  });

  it('los personajes guardados antes de los accesorios siguen siendo válidos', () => {
    const legacy = { hair: 'bob', hairColor: 1, skin: 2, eyes: 'angry', eyeColor: 0, mouth: 'grin', clothes: 'vest', clothesColor: 3 };
    expect(parseAvatar(legacy)).toMatchObject({ ...legacy, sex: 'male', hat: 'none', glasses: 'none', beard: 'none', accessory: 'none' });
  });

  it.each([
    ['estilo de pelo desconocido', { ...valid, hair: 'mohicano' }],
    ['sexo desconocido', { ...valid, sex: 'otro' }],
    ['color fuera de la paleta', { ...valid, skin: 99 }],
    ['color del sombrero fuera de la paleta', { ...valid, hatColor: 12 }],
    ['color con decimales', { ...valid, hairColor: 1.5 }],
    ['color como texto', { ...valid, eyeColor: '1' }],
    ['sombrero desconocido', { ...valid, hat: 'casco' }],
    ['cuerpo vacío', undefined],
  ])('rechaza %s', (_label, input) => {
    expect(() => parseAvatar(input)).toThrow('Personaje inválido');
  });

  it('el personaje por defecto es siempre el mismo para un usuario y es válido', () => {
    expect(defaultAvatar('usuario-1')).toEqual(defaultAvatar('usuario-1'));
    expect(parseAvatar(defaultAvatar('usuario-2'))).toEqual(defaultAvatar('usuario-2'));
  });

  it('los personajes por defecto son humanos, variados y las mujeres nunca traen barba', () => {
    const all = Array.from({ length: 60 }, (_, i) => defaultAvatar(`u${i}`));
    expect(all.every((a) => a.sex !== 'nonbinary')).toBe(true);
    expect(new Set(all.map((a) => JSON.stringify(a))).size).toBeGreaterThan(50);
    expect(all.filter((a) => a.sex === 'female').every((a) => a.sex === 'female' && a.beard === 'none')).toBe(true);
    expect(all.some((a) => a.sex === 'male')).toBe(true);
    expect(all.some((a) => a.sex === 'female')).toBe(true);
  });
});

// Evita que el linter de imports elimine la constante usada solo para documentar la velocidad por defecto.
void DEFAULT_TIMINGS;
