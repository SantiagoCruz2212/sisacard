export const MAX_POINTS = 10;

/**
 * Puntos por posición: el 1.º se lleva MAX_POINTS y baja linealmente hasta el último (siempre ≥ 1).
 * Con 4 jugadores: 10, 8, 5, 3. Los empatados comparten posición y por tanto puntos.
 */
export function pointsForPlace(place: number, totalPlayers: number): number {
  const p = Math.min(Math.max(place, 1), totalPlayers);
  return Math.max(1, Math.round((MAX_POINTS * (totalPlayers - p + 1)) / totalPlayers));
}
