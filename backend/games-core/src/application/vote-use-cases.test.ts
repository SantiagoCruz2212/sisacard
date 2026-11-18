import { describe, expect, it } from 'vitest';
import { defaultAvatar } from '../domain/avatar.js';
import { FakeScheduler } from '../domain/fake-scheduler.js';
import type { Player } from '../domain/shared.js';
import { InMemoryGameVoteRepository, InMemoryPresenceRegistry, InMemoryRoomRepository } from '../infrastructure/in-memory.js';
import type { RealtimeNotifier } from './ports.js';
import { CreateRoom, JoinRoom, RoomPublisher } from './use-cases.js';
import { CastGameVote, CloseGameVote, StartGameVote, VotePublisher } from './vote-use-cases.js';
import type { GameVoteView } from './views.js';

const fakeAvatars = { get: (id: string) => defaultAvatar(id), set: () => {} };
const ana = { id: 'a', username: 'Ana' };
const beto = { id: 'b', username: 'Beto' };
const cami = { id: 'c', username: 'Cami' };

function setup(online: Player[] = [ana, beto, cami]) {
  const scheduler = new FakeScheduler();
  const rooms = new InMemoryRoomRepository();
  const presence = new InMemoryPresenceRegistry();
  const votes = new InMemoryGameVoteRepository();
  const lastVote = new Map<string, GameVoteView | null>();
  const notifier: RealtimeNotifier = {
    sendRoomState: () => {},
    broadcastLobby: () => {},
    sendLobbyHistory: () => {},
    broadcastLobbyMessage: () => {},
    sendVoteState: (userId, view) => void lastVote.set(userId, view),
  };
  online.forEach((u) => presence.connect(u, `s-${u.id}`));

  const roomPublisher = new RoomPublisher(rooms, presence, notifier, fakeAvatars);
  const publisher = new VotePublisher(votes, presence, notifier, scheduler);
  const closer = new CloseGameVote(
    votes, rooms, presence, scheduler, 1, publisher,
    new CreateRoom(rooms, roomPublisher), new JoinRoom(rooms, roomPublisher),
  );
  return {
    scheduler, rooms, votes, lastVote,
    start: new StartGameVote(votes, rooms, scheduler, 1, publisher, closer),
    cast: new CastGameVote(votes, rooms, presence, publisher, closer),
  };
}

describe('votación de juegos', () => {
  it('cuando todos votan cierra antes de tiempo, crea la sala del ganador y mete a sus votantes', () => {
    const t = setup();
    t.start.execute(ana);
    t.cast.execute(ana, 'uno');
    t.cast.execute(beto, 'uno');
    t.cast.execute(cami, 'impostor');

    const room = t.rooms.findByUserId('a');
    expect(room?.game).toBe('uno');
    expect(room?.hostId).toBe('a');
    expect(room?.players.map((p) => p.id).sort()).toEqual(['a', 'b']);
    expect(t.rooms.findByUserId('c')).toBeUndefined();
    expect(t.lastVote.get('c')?.result).toEqual({ winner: 'uno', roomId: room?.id });
  });

  it('al agotarse el tiempo cierra con los votos que haya', () => {
    const t = setup();
    t.start.execute(ana);
    t.cast.execute(beto, 'impostor');
    expect(t.votes.current()?.status).toBe('open');
    t.scheduler.advance(30_000);
    expect(t.votes.current()?.status).toBe('closed');
    expect(t.rooms.findByUserId('b')?.game).toBe('impostor');
    expect(t.rooms.findByUserId('a')?.game).toBe('impostor'); // el que inició la votación es el anfitrión
  });

  it('sin votos no se crea ninguna sala', () => {
    const t = setup();
    t.start.execute(ana);
    t.scheduler.advance(30_000);
    expect(t.rooms.list()).toHaveLength(0);
    expect(t.lastVote.get('a')?.result).toEqual({ winner: null, roomId: null });
  });

  it('el resultado se muestra unos segundos y después se limpia', () => {
    const t = setup();
    t.start.execute(ana);
    t.scheduler.advance(30_000);
    expect(t.lastVote.get('a')).not.toBeNull();
    t.scheduler.advance(20_000);
    expect(t.lastVote.get('a')).toBeNull();
  });

  it('no permite dos votaciones a la vez ni votar sin votación abierta', () => {
    const t = setup();
    expect(() => t.cast.execute(ana, 'uno')).toThrow('No hay una votación abierta');
    t.start.execute(ana);
    expect(() => t.start.execute(beto)).toThrow('Ya hay una votación en curso');
  });

  it('quien está en una sala no puede iniciar ni votar', () => {
    const t = setup();
    const roomPublisher = new RoomPublisher(t.rooms, new InMemoryPresenceRegistry(), { sendRoomState() {}, broadcastLobby() {}, sendLobbyHistory() {}, broadcastLobbyMessage() {}, sendVoteState() {} }, fakeAvatars);
    new CreateRoom(t.rooms, roomPublisher).execute(cami, 'uno');
    expect(() => t.start.execute(cami)).toThrow('Sal de tu sala');
    t.start.execute(ana);
    expect(() => t.cast.execute(cami, 'uno')).toThrow('Sal de tu sala');
  });

  it('los usuarios que ya están en una sala no bloquean el cierre anticipado', () => {
    const t = setup();
    const roomPublisher = new RoomPublisher(t.rooms, new InMemoryPresenceRegistry(), { sendRoomState() {}, broadcastLobby() {}, sendLobbyHistory() {}, broadcastLobbyMessage() {}, sendVoteState() {} }, fakeAvatars);
    new CreateRoom(t.rooms, roomPublisher).execute(cami, 'impostor');
    t.start.execute(ana);
    t.cast.execute(ana, 'uno');
    t.cast.execute(beto, 'uno'); // cami está en una sala: no cuenta
    expect(t.votes.current()?.status).toBe('closed');
    expect(t.rooms.findByUserId('a')?.game).toBe('uno');
  });
});
