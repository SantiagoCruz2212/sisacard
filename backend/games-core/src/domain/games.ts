import type { GameDefinition, GameId } from './game.js';
import { ImpostorGame, scaleTimings } from './impostor/impostor-game.js';
import { BlackjackGame } from './blackjack/blackjack-game.js';
import { AmongUsGame } from './amongus/amongus-game.js';
import { RouletteGame } from './roulette/roulette-game.js';
import { UnoGame } from './uno/uno-game.js';
import { defaultUnoSettings, parseUnoSettings } from './uno/uno-settings.js';

/** Catálogo de juegos. Agregar un juego = implementar GameMatch y registrarlo aquí. */
export const GAMES: Record<GameId, GameDefinition> = {
  impostor: {
    id: 'impostor',
    minPlayers: 3,
    maxPlayers: 12,
    create: (players, ctx) =>
      new ImpostorGame(players, {
        isOnline: ctx.isOnline,
        scheduler: ctx.scheduler,
        timings: scaleTimings(ctx.speed),
        onChange: ctx.onChange,
        random: ctx.random,
        onFinished: (result) =>
          ctx.onFinished({
            results: result.players.map((p) => ({
              userId: p.userId,
              place: p.place,
              extraStats: [`${p.role}_played`, ...(p.won ? [`${p.role}_wins`] : [])],
            })),
          }),
      }),
  },
  uno: {
    id: 'uno',
    minPlayers: 2,
    maxPlayers: 10,
    defaultSettings: () => ({ ...defaultUnoSettings() }),
    parseSettings: (raw) => ({ ...parseUnoSettings(raw) }),
    create: (players, ctx, settings) => new UnoGame(players, ctx, parseUnoSettings(settings)),
  },
  blackjack: {
    id: 'blackjack',
    minPlayers: 2,
    maxPlayers: 8,
    create: (players, ctx) => new BlackjackGame(players, ctx),
  },
  roulette: {
    id: 'roulette',
    minPlayers: 2,
    maxPlayers: 8,
    create: (players, ctx) => new RouletteGame(players, ctx),
  },
  amongus: {
    id: 'amongus',
    minPlayers: 4,
    maxPlayers: 10,
    create: (players, ctx) => new AmongUsGame(players, ctx),
  },
};

export const isGameId = (value: unknown): value is GameId => typeof value === 'string' && value in GAMES;
