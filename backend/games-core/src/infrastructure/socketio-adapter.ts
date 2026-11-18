import type { Server } from 'socket.io';
import { identityFromHeaders } from '@sisacard/contracts';
import type { RealtimeNotifier } from '../application/ports.js';
import type { CastGameVote, StartGameVote } from '../application/vote-use-cases.js';
import type {
  CreateRoom,
  HandlePresence,
  JoinRoom,
  LeaveRoom,
  PerformGameAction,
  RematchRoom,
  SendLobbyMessage,
  SendRoomMessage,
  StartGame,
} from '../application/use-cases.js';
import { DomainError, type Player } from '../domain/shared.js';

/** Adaptador de salida: implementa RealtimeNotifier emitiendo eventos Socket.IO. */
export class SocketIoNotifier implements RealtimeNotifier {
  constructor(private io: Server) {}

  sendRoomState: RealtimeNotifier['sendRoomState'] = (userId, view) =>
    void this.io.to(`user:${userId}`).emit('room:state', view);
  broadcastLobby: RealtimeNotifier['broadcastLobby'] = (view) => void this.io.emit('lobby:state', view);
  sendLobbyHistory: RealtimeNotifier['sendLobbyHistory'] = (userId, messages) =>
    void this.io.to(`user:${userId}`).emit('lobby:history', messages);
  broadcastLobbyMessage: RealtimeNotifier['broadcastLobbyMessage'] = (message) =>
    void this.io.emit('lobby:chat', message);
  sendVoteState: RealtimeNotifier['sendVoteState'] = (userId, view) =>
    void this.io.to(`user:${userId}`).emit('vote:state', view);
}

export interface UseCases {
  presence: HandlePresence;
  createRoom: CreateRoom;
  joinRoom: JoinRoom;
  leaveRoom: LeaveRoom;
  startGame: StartGame;
  rematchRoom: RematchRoom;
  performAction: PerformGameAction;
  sendRoomMessage: SendRoomMessage;
  sendLobbyMessage: SendLobbyMessage;
  startVote: StartGameVote;
  castVote: CastGameVote;
}

/** Adaptador de entrada: traduce eventos Socket.IO a casos de uso. No contiene reglas de negocio. */
export function registerSocketHandlers(io: Server, uc: UseCases, gatewaySecret: string) {
  // La identidad llega ya validada por el api-gateway en las cabeceras del handshake.
  io.use((socket, next) => {
    const identity = identityFromHeaders(socket.handshake.headers, gatewaySecret);
    if (!identity) return next(new Error('unauthorized'));
    socket.data.user = identity;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as Player;
    socket.join(`user:${user.id}`);
    uc.presence.connected(user, socket.id);

    const on = (event: string, fn: (payload: Record<string, unknown>) => Record<string, unknown> | void) =>
      socket.on(event, (payload: unknown, ack?: (r: unknown) => void) => {
        try {
          const data = fn((payload ?? {}) as Record<string, unknown>) ?? {};
          ack?.({ ok: true, ...data });
        } catch (e) {
          if (!(e instanceof DomainError)) console.error(e);
          ack?.({ ok: false, error: e instanceof DomainError ? e.message : 'Error interno' });
        }
      });

    on('lobby:chat', ({ text }) => uc.sendLobbyMessage.execute(user, text));
    on('room:create', ({ game }) => uc.createRoom.execute(user, game));
    on('room:join', ({ roomId }) => uc.joinRoom.execute(user, roomId));
    on('room:leave', () => uc.leaveRoom.execute(user.id));
    on('room:chat', ({ text }) => uc.sendRoomMessage.execute(user, text));
    on('room:start', () => uc.startGame.execute(user.id));
    on('room:rematch', () => uc.rematchRoom.execute(user.id));
    on('vote:start', () => uc.startVote.execute(user));
    on('vote:cast', ({ game }) => uc.castVote.execute(user, game));
    on('game:action', (action) => uc.performAction.execute(user.id, action));

    socket.on('disconnect', () => uc.presence.disconnected(user, socket.id));
  });
}
