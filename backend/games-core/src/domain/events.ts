import type { GameId, PlayerResult } from './game.js';
import type { Player } from './shared.js';

/** Eventos de dominio. Hoy circulan en proceso; el mismo contrato puede publicarse luego en RabbitMQ. */
export interface GameFinished {
  type: 'game.finished';
  game: GameId;
  /** Foto de los participantes (para guardar el nombre en la tabla de clasificación). */
  players: Player[];
  results: PlayerResult[];
  occurredAt: string;
}

export type DomainEvent = GameFinished;
