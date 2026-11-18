import type { Avatar } from '@/shared/models/avatar';

export interface AppUser {
  id: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  ts: number;
}

export interface LobbyState {
  online: AppUser[];
  rooms: { id: string; game: GameId; host: string; players: number; spectators: number; max: number; status: 'waiting' | 'playing' }[];
}

export type GameId = 'impostor' | 'uno' | 'blackjack';

export interface PlaceResult {
  userId: string;
  place: number;
  points: number;
}

export type ImpostorPhase = 'reveal' | 'clues' | 'voting' | 'result' | 'guess' | 'ended';

export interface ImpostorView {
  type: 'impostor';
  phase: ImpostorPhase;
  round: number;
  deadline: number;
  now: number;
  category: string;
  role: 'crew' | 'impostor' | 'spectator';
  word: string | null;
  players: { id: string; username: string; out: boolean; left: boolean; connected: boolean; voted: boolean }[];
  turnId: string | null;
  clues: { round: number; userId: string; text: string }[];
  /** undefined = no ha votado, null = saltó el voto */
  myVote?: string | null;
  result: {
    eliminated: string | null;
    wasImpostor: boolean;
    tally: Record<string, number>;
    votes: { from: string; to: string | null }[];
  } | null;
  guesserId: string | null;
  guess: { text: string; correct: boolean } | null;
  winner: 'crew' | 'impostor' | null;
  results: PlaceResult[] | null;
  reveal: { word: string; impostors: string[] } | null;
}

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  id: number;
  color: UnoColor | 'wild';
  value: UnoValue;
}

export interface UnoLogEntry {
  userId: string;
  kind: 'play' | 'draw' | 'unoPenalty' | 'finished' | 'timeout';
  card?: UnoCard;
  color?: UnoColor;
  count?: number;
  place?: number;
}

export interface UnoView {
  type: 'uno';
  phase: 'playing' | 'ended';
  deadline: number;
  now: number;
  players: { id: string; username: string; cards: number; place: number | null; left: boolean; connected: boolean }[];
  myHand: UnoCard[];
  playable: number[];
  top: UnoCard | null;
  currentColor: UnoColor;
  turnId: string | null;
  direction: 1 | -1;
  drawCount: number;
  canDraw: boolean;
  canPass: boolean;
  log: UnoLogEntry[];
  results: PlaceResult[] | null;
}

export interface BjCard {
  id: number;
  rank: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

export interface BlackjackPlayer {
  id: string;
  username: string;
  cards: BjCard[];
  value: number;
  soft: boolean;
  status: 'waiting' | 'stood' | 'busted' | 'out';
  out: boolean;
  left: boolean;
  connected: boolean;
  /** Valor de la mano en cada ronda del ciclo actual. */
  roundValues: number[];
  total: number;
}

export interface BlackjackLogEntry {
  kind: 'bust' | 'round' | 'cut' | 'tie' | 'reset' | 'left';
  userId?: string;
  ids?: string[];
  value?: number;
  round?: number;
}

export interface BlackjackView {
  type: 'blackjack';
  phase: 'playing' | 'between' | 'ended';
  round: number;
  cycle: number;
  target: number;
  cutTarget: number;
  deadline: number;
  now: number;
  players: BlackjackPlayer[];
  turnId: string | null;
  canHit: boolean;
  canStand: boolean;
  log: BlackjackLogEntry[];
  results: PlaceResult[] | null;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  played: number;
  wins: number;
}

export interface RoomState {
  id: string;
  game: GameId;
  hostId: string;
  status: 'waiting' | 'playing';
  min: number;
  max: number;
  players: (AppUser & { connected: boolean; avatar: Avatar })[];
  /** Quienes miran con la partida en curso. */
  spectators: (AppUser & { connected: boolean; avatar: Avatar })[];
  chat: ChatMessage[];
  play: ImpostorView | UnoView | BlackjackView | null;
}

export type PlayerStats = Record<string, Record<string, number>>;

export interface GameVoteState {
  id: string;
  status: 'open' | 'closed';
  options: GameId[];
  startedBy: string;
  deadline: number;
  now: number;
  tally: Record<GameId, number>;
  voters: { userId: string; username: string; game: GameId }[];
  myVote: GameId | null;
  result: { winner: GameId | null; roomId: string | null } | null;
}
