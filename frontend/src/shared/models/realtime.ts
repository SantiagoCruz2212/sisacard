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

export type GameId = 'impostor' | 'uno' | 'blackjack' | 'roulette' | 'amongus';

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

export type UnoLightColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoDarkColor = 'pink' | 'teal' | 'orange' | 'purple';
export type UnoColor = UnoLightColor | UnoDarkColor;
export type UnoDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type UnoValue =
  | UnoDigit
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4'
  | 'number'
  | 'draw4'
  | 'double'
  | 'half'
  | 'plusAll'
  | 'target4'
  | 'minus1'
  | 'replay'
  | 'dice4'
  | 'dice6'
  | 'dice8'
  | 'dice12'
  | 'dice20'
  | 'eye'
  | 'swap'
  | 'joker'
  | 'rotate'
  | 'draw1'
  | 'flip'
  | 'wildDraw2'
  | 'draw5'
  | 'skipAll'
  | 'wildDrawColor';

export interface UnoCardFace {
  color: UnoColor | 'wild';
  value: UnoValue;
}

export interface UnoCard extends UnoCardFace {
  id: number;
}

export interface UnoSettings {
  /** Cartas de UNO Infinity (en Flip, a los dos lados). */
  infinity: boolean;
  /** Baraja de dos caras de UNO Flip. */
  flip: boolean;
  stacking: boolean;
  challenge: boolean;
  sevenZero: boolean;
  jumpIn: boolean;
  catchUno: boolean;
}

export interface UnoLogEntry {
  userId: string;
  kind:
    | 'play'
    | 'draw'
    | 'unoPenalty'
    | 'finished'
    | 'timeout'
    | 'challenge'
    | 'caught'
    | 'saidUno'
    | 'swap'
    | 'rotate'
    | 'flip'
    | 'dice'
    | 'discard'
    | 'eye'
    | 'jumpIn';
  card?: UnoCardFace;
  color?: UnoColor;
  number?: UnoDigit;
  count?: number;
  place?: number;
  targetId?: string;
  roll?: number;
  success?: boolean;
}

export interface UnoPlayer {
  id: string;
  username: string;
  cards: number;
  place: number | null;
  left: boolean;
  connected: boolean;
  /** Se quedó con 1 carta sin decir UNO: se le puede atrapar. */
  vulnerable: boolean;
  /** UNO Flip: la otra cara de sus cartas (null en tu propia mano o fuera de Flip). */
  backs: UnoCardFace[] | null;
}

export interface UnoView {
  type: 'uno';
  phase: 'playing' | 'ended';
  deadline: number;
  now: number;
  settings: UnoSettings;
  side: 'light' | 'dark';
  players: UnoPlayer[];
  myHand: UnoCard[];
  playable: number[];
  top: UnoCard | null;
  currentColor: UnoColor;
  currentValue: UnoValue;
  turnId: string | null;
  direction: 1 | -1;
  drawCount: number;
  /** UNO Flip: la cara que muestra el mazo. */
  deckBack: UnoCardFace | null;
  canDraw: boolean;
  canPass: boolean;
  /** Robo acumulado (apilar o desafío) que paga victimId si no responde. */
  penalty: { amount: number; victimId: string; canChallenge: boolean } | null;
  /** Lo que tienes que resolver antes de que pase tu turno. */
  pending: { kind: 'discard' | 'color'; count: number } | null;
  choosingId: string | null;
  /** Carta Ojo: la mano que estás viendo. */
  reveal: { targetId: string; cards: UnoCardFace[]; until: number } | null;
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

export interface RouletteLogEntry {
  kind: 'click' | 'bang' | 'spin' | 'left' | 'timeout';
  userId: string;
}

export interface RouletteView {
  type: 'roulette';
  phase: 'playing' | 'between' | 'ended';
  chambers: number;
  position: number;
  deadline: number;
  now: number;
  players: { id: string; username: string; out: boolean; left: boolean; connected: boolean; survived: number }[];
  turnId: string | null;
  canAct: boolean;
  log: RouletteLogEntry[];
  results: PlaceResult[] | null;
}

export type AmongRoomId = 'cafeteria' | 'office' | 'servers' | 'storage' | 'meeting' | 'kitchen';

export interface AmongUsView {
  type: 'amongus';
  phase: 'playing' | 'meeting' | 'result' | 'ended';
  deadline: number;
  now: number;
  map: {
    width: number;
    height: number;
    vision: number;
    taskRange: number;
    rooms: { id: AmongRoomId; x: number; y: number; w: number; h: number }[];
  };
  me: {
    role: 'crew' | 'impostor';
    alive: boolean;
    x: number;
    y: number;
    tasks: { id: AmongRoomId; done: boolean; x: number; y: number }[];
    /** Avance 0..1 de la tarea en curso, o null. */
    working: number | null;
    canTask: boolean;
    canKill: boolean;
    canReport: boolean;
    /** ms que faltan para poder eliminar de nuevo. */
    killIn: number;
  } | null;
  role: 'crew' | 'impostor' | 'spectator';
  players: {
    id: string;
    username: string;
    x: number;
    y: number;
    alive: boolean;
    connected: boolean;
    voted: boolean;
    working: boolean;
    impostor?: boolean;
  }[];
  bodies: { id: string; x: number; y: number }[];
  tasksDone: number;
  tasksTotal: number;
  /** undefined = no ha votado, null = saltó el voto */
  myVote?: string | null;
  meeting: {
    ejected: string | null;
    wasImpostor: boolean;
    tally: Record<string, number>;
    skips: number;
    votes: { from: string; to: string | null }[];
  } | null;
  winner: 'crew' | 'impostor' | null;
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
  /** Opciones del juego que elige el anfitrión (UNO: baraja y reglas de la casa). */
  settings: Record<string, unknown>;
  players: (AppUser & { connected: boolean; avatar: Avatar })[];
  /** Quienes miran con la partida en curso. */
  spectators: (AppUser & { connected: boolean; avatar: Avatar })[];
  chat: ChatMessage[];
  play: ImpostorView | UnoView | BlackjackView | RouletteView | AmongUsView | null;
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
