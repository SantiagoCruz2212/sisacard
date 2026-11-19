import type { AmongUsView, BlackjackView, ImpostorView, RouletteView, UnoView } from '@/shared/models/realtime';

type Play = ImpostorView | UnoView | BlackjackView | RouletteView | AmongUsView | null;

/** Quién tiene que actuar ahora (turno de pista, de adivinar o de jugar carta). */
export function activePlayerId(play: Play): string | null {
  if (!play) return null;
  if (play.type === 'amongus') return null; // tiempo real: no hay turnos
  if (play.type === 'uno' || play.type === 'blackjack' || play.type === 'roulette') return play.turnId;
  return play.phase === 'guess' ? play.guesserId : play.turnId;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Texto corto y estado visual de cada asiento según el juego en curso. */
export function seatInfo(play: Play, userId: string): { label: string | null; dim: boolean } {
  if (!play) return { label: null, dim: false };
  if (play.type === 'amongus') return { label: null, dim: false };
  if (play.type === 'roulette') {
    const p = play.players.find((x) => x.id === userId);
    if (!p) return { label: null, dim: false };
    if (p.out) return { label: p.left ? null : '💀', dim: true };
    return { label: p.survived ? `😮‍💨 ${p.survived}` : null, dim: false };
  }
  if (play.type === 'blackjack') {
    const p = play.players.find((x) => x.id === userId);
    if (!p) return { label: null, dim: false };
    if (p.out) return { label: p.status === 'busted' ? '💥' : '✖', dim: true };
    return { label: p.cards.length ? String(p.value) : null, dim: false };
  }
  if (play.type === 'uno') {
    const p = play.players.find((x) => x.id === userId);
    if (!p) return { label: null, dim: false };
    if (p.left) return { label: null, dim: true };
    if (p.place) return { label: MEDALS[p.place - 1] ?? `${p.place}.º`, dim: true };
    return { label: `🃏 ${p.cards}`, dim: false };
  }
  const p = play.players.find((x) => x.id === userId);
  if (!p) return { label: null, dim: false };
  return { label: p.out ? '✖' : null, dim: p.out };
}

/**
 * Jugadores que han muerto o perdido (para el disparo y el humo).
 * - Impostor: eliminados por votación y, al terminar, quienes pertenecen al equipo perdedor.
 * - UNO: al terminar, quien queda en último lugar.
 */
export function deadPlayerIds(play: Play): Set<string> {
  const dead = new Set<string>();
  if (!play) return dead;

  if (play.type === 'amongus') return dead; // las muertes son silenciosas

  if (play.type === 'roulette' || play.type === 'blackjack') {
    for (const p of play.players) if (p.out && !p.left) dead.add(p.id);
    return dead;
  }

  if (play.type === 'impostor') {
    for (const p of play.players) if (p.out && !p.left) dead.add(p.id);
    if (play.phase === 'ended' && play.reveal && play.winner) {
      const impostors = new Set(play.reveal.impostors);
      for (const p of play.players) {
        if (p.left) continue;
        const losingTeam = play.winner === 'crew' ? impostors.has(p.id) : !impostors.has(p.id);
        if (losingTeam) dead.add(p.id);
      }
    }
    return dead;
  }

  if (play.phase === 'ended' && play.results && play.results.length > 1) {
    const last = Math.max(...play.results.map((r) => r.place));
    for (const r of play.results) if (r.place === last) dead.add(r.userId);
  }
  return dead;
}
