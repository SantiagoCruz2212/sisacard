import type { Player, Scheduler } from './shared.js';

export type GameId = 'impostor' | 'uno';

/** Posición final de un jugador. Los empates comparten posición (1, 1, 3…). */
export interface PlayerResult {
  userId: string;
  place: number;
  /** Contadores específicos del juego que se suman a las estadísticas (p. ej. impostor_wins). */
  extraStats: string[];
}

export interface GameOutcome {
  results: PlayerResult[];
}

export interface GameAction {
  type?: unknown;
  text?: unknown;
  target?: unknown;
  cardId?: unknown;
  color?: unknown;
  uno?: unknown;
}

export interface MatchContext {
  isOnline: (userId: string) => boolean;
  scheduler: Scheduler;
  /** 1 = tiempos normales; menor = más rápido (pruebas). */
  speed: number;
  /** El estado cambió (acción o temporizador): hay que notificar a los jugadores. */
  onChange: () => void;
  onFinished: (outcome: GameOutcome) => void;
  random?: () => number;
}

/** Contrato que cumple cada juego. La sala solo conoce esta interfaz. */
export interface GameMatch {
  start(): void;
  destroy(): void;
  action(userId: string, action: GameAction): void;
  presenceChanged(): void;
  playerLeft(userId: string): void;
  isFinished(): boolean;
  view(userId: string): { type: GameId };
}

export interface GameDefinition {
  id: GameId;
  minPlayers: number;
  maxPlayers: number;
  create(players: Player[], ctx: MatchContext): GameMatch;
}
