// Composition root: único lugar donde se eligen las implementaciones concretas de los puertos.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { DEV_GATEWAY_SECRET } from '@sisacard/contracts';
import { RecordGameStats } from './application/record-game-stats.js';
import {
  BuyBattlePass,
  BuyItem,
  CreateRoom,
  GetAvatar,
  GetLeaderboard,
  GetPlayerStats,
  GetShop,
  HandlePresence,
  JoinRoom,
  LeaveRoom,
  PerformGameAction,
  RematchRoom,
  RoomCloser,
  RoomPublisher,
  SendLobbyMessage,
  SendRoomMessage,
  StartGame,
  UpdateAvatar,
} from './application/use-cases.js';
import { CastGameVote, CloseGameVote, StartGameVote, VotePublisher } from './application/vote-use-cases.js';
import { createHttpApp } from './infrastructure/http-app.js';
import {
  InMemoryChatHistory,
  InMemoryGameVoteRepository,
  InMemoryPresenceRegistry,
  InMemoryRoomRepository,
  InProcessEventBus,
  SystemScheduler,
} from './infrastructure/in-memory.js';
import { SocketIoNotifier, registerSocketHandlers } from './infrastructure/socketio-adapter.js';
import { SqliteAvatarDirectory } from './infrastructure/sqlite-avatar-directory.js';
import { SqliteWalletRepository } from './infrastructure/sqlite-wallet-repository.js';
import { SqliteStatsRepository } from './infrastructure/sqlite-stats-repository.js';

const PORT = Number(process.env.GAMES_PORT ?? 3102);
const gatewaySecret = process.env.GATEWAY_SECRET ?? DEV_GATEWAY_SECRET;
const dataDir = process.env.DATA_DIR ?? fileURLToPath(new URL('../data/', import.meta.url));
// GAMES_FAST=1 (o IMPOSTOR_FAST=1) acorta los tiempos de los juegos para pruebas automáticas.
const speed = process.env.GAMES_FAST || process.env.IMPOSTOR_FAST ? 0.1 : 1;

// Adaptadores
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: true } });
const notifier = new SocketIoNotifier(io);
const rooms = new InMemoryRoomRepository();
const presence = new InMemoryPresenceRegistry();
const history = new InMemoryChatHistory();
const gameVotes = new InMemoryGameVoteRepository();
const stats = new SqliteStatsRepository(`${dataDir.replace(/[\\/]+$/, '')}/games.db`);
const avatars = new SqliteAvatarDirectory(`${dataDir.replace(/[\\/]+$/, '')}/games.db`);
const wallet = new SqliteWalletRepository(`${dataDir.replace(/[\\/]+$/, '')}/games.db`);
const bus = new InProcessEventBus();
const scheduler = new SystemScheduler();

// Aplicación
const publisher = new RoomPublisher(rooms, presence, notifier, avatars);
const closer = new RoomCloser(rooms, notifier, publisher);
const leaveRoom = new LeaveRoom(rooms, presence, notifier, publisher, closer);
const votePublisher = new VotePublisher(gameVotes, presence, notifier, scheduler);
const createRoom = new CreateRoom(rooms, publisher);
const joinRoom = new JoinRoom(rooms, publisher);
const closeVote = new CloseGameVote(gameVotes, rooms, presence, scheduler, speed, votePublisher, createRoom, joinRoom);
const getStats = new GetPlayerStats(stats);
const getLeaderboard = new GetLeaderboard(stats);
const recordStats = new RecordGameStats(stats, wallet);
bus.subscribe('game.finished', (event) => recordStats.handle(event));

registerSocketHandlers(
  io,
  {
    presence: new HandlePresence(presence, rooms, notifier, history, publisher, closer, leaveRoom, scheduler, votePublisher),
    createRoom,
    joinRoom,
    leaveRoom,
    startGame: new StartGame(rooms, presence, scheduler, speed, bus, publisher),
    rematchRoom: new RematchRoom(rooms, presence, publisher),
    performAction: new PerformGameAction(rooms, publisher),
    sendRoomMessage: new SendRoomMessage(rooms, scheduler, publisher),
    sendLobbyMessage: new SendLobbyMessage(history, scheduler, notifier),
    startVote: new StartGameVote(gameVotes, rooms, scheduler, speed, votePublisher, closeVote),
    castVote: new CastGameVote(gameVotes, rooms, presence, votePublisher, closeVote),
  },
  gatewaySecret,
);

// Socket.IO ya engancha las peticiones /socket.io/; el resto va a la app HTTP.
const httpApp = createHttpApp({
  getStats,
  getLeaderboard,
  getAvatar: new GetAvatar(avatars),
  updateAvatar: new UpdateAvatar(avatars, rooms, publisher, wallet),
  getShop: new GetShop(wallet),
  buyItem: new BuyItem(wallet),
  buyPass: new BuyBattlePass(wallet),
  gatewaySecret,
});
httpServer.on('request', (req, res) => {
  if (!req.url?.startsWith('/socket.io')) httpApp(req, res);
});

httpServer.listen(PORT, () => console.log(`games-core en :${PORT}`));
