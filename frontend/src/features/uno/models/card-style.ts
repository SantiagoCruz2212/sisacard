import type { UnoColor } from '@/shared/models/realtime';

// Las clases se escriben completas para que Tailwind las detecte.

/** Relleno y trazo SVG por color (cartas en SVG). */
export const FILL_CLASS: Record<UnoColor, string> = {
  red: 'fill-uno-red',
  yellow: 'fill-uno-yellow',
  green: 'fill-uno-green',
  blue: 'fill-uno-blue',
  pink: 'fill-uno-pink',
  teal: 'fill-uno-teal',
  orange: 'fill-uno-orange',
  purple: 'fill-uno-purple',
};

export const STROKE_CLASS: Record<UnoColor, string> = {
  red: 'stroke-uno-red',
  yellow: 'stroke-uno-yellow',
  green: 'stroke-uno-green',
  blue: 'stroke-uno-blue',
  pink: 'stroke-uno-pink',
  teal: 'stroke-uno-teal',
  orange: 'stroke-uno-orange',
  purple: 'stroke-uno-purple',
};

/** Colores claros: sobre ellos la tinta va oscura. */
export const LIGHT_INK_COLORS: UnoColor[] = ['yellow', 'teal', 'orange'];

export const DOT_COLOR_CLASS: Record<UnoColor, string> = {
  red: 'bg-uno-red',
  yellow: 'bg-uno-yellow',
  green: 'bg-uno-green',
  blue: 'bg-uno-blue',
  pink: 'bg-uno-pink',
  teal: 'bg-uno-teal',
  orange: 'bg-uno-orange',
  purple: 'bg-uno-purple',
};

export const LIGHT_COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];
export const DARK_COLORS: UnoColor[] = ['pink', 'teal', 'orange', 'purple'];
export const colorsOfSide = (side: 'light' | 'dark') => (side === 'dark' ? DARK_COLORS : LIGHT_COLORS);

export const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** Cartas que piden elegir a otro jugador al jugarlas. */
export const TARGETED_VALUES = ['target4', 'eye', 'swap'];
