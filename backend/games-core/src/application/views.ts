import type { Avatar } from '../domain/avatar.js';
import type { GameVote } from '../domain/game-vote.js';
import type { Room } from '../domain/room.js';
import type { Player } from '../domain/shared.js';

export function roomView(room: Room, userId: string, isOnline: (id: string) => boolean, avatarOf: (id: string) => Avatar) {
  const seat = (p: Player) => ({ ...p, connected: isOnline(p.id), avatar: avatarOf(p.id) });
  return {
    id: room.id,
    game: room.game,
    hostId: room.hostId,
    status: room.status,
    min: room.minPlayers,
    max: room.maxPlayers,
    settings: room.settings,
    players: room.players.map(seat),
    spectators: room.spectators.map(seat),
    chat: room.chat,
    play: room.match?.view(userId) ?? null,
  };
}
export type RoomView = ReturnType<typeof roomView>;

export function lobbyView(rooms: Room[], online: Player[]) {
  return {
    online,
    rooms: rooms.map((r) => ({
      id: r.id,
      game: r.game,
      host: r.players.find((p) => p.id === r.hostId)?.username ?? '?',
      players: r.players.length,
      spectators: r.spectators.length,
      max: r.maxPlayers,
      status: r.status,
    })),
  };
}
export type LobbyView = ReturnType<typeof lobbyView>;

export function gameVoteView(vote: GameVote, userId: string, now: number) {
  return {
    id: vote.id,
    status: vote.status,
    options: vote.options,
    startedBy: vote.startedBy.username,
    deadline: vote.deadline,
    now,
    tally: vote.tally(),
    voters: vote.voters(),
    myVote: vote.voteOf(userId),
    result: vote.status === 'closed' ? { winner: vote.winner, roomId: vote.roomId } : null,
  };
}
export type GameVoteView = ReturnType<typeof gameVoteView>;
