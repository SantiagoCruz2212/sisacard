import type { TFunction } from 'i18next';
import type { UnoCardFace } from '@/shared/models/realtime';

/** Nombre accesible de una carta, p. ej. "rojo 5" o "comodín". */
export function cardLabel(card: UnoCardFace, t: TFunction): string {
  const value = /^\d$/.test(card.value) ? card.value : t(`uno.values.${card.value as 'skip'}`);
  return card.color === 'wild' ? value : `${t(`uno.colors.${card.color}`)} ${value}`;
}
