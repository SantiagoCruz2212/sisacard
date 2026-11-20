import type { UnoCardFace, UnoColor } from '@/shared/models/realtime';

// Las clases se escriben completas para que Tailwind las detecte.
export const CARD_COLOR_CLASS: Record<UnoCardFace['color'], string> = {
  red: 'bg-uno-red text-white',
  yellow: 'bg-uno-yellow text-black',
  green: 'bg-uno-green text-white',
  blue: 'bg-uno-blue text-white',
  pink: 'bg-uno-pink text-white',
  teal: 'bg-uno-teal text-black',
  orange: 'bg-uno-orange text-black',
  purple: 'bg-uno-purple text-white',
  wild: 'bg-uno-wild text-white ring-1 ring-white/30',
};

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

export const VALUE_SYMBOL: Record<string, string> = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: '★',
  wild4: '+4',
  number: '#',
  draw4: '+4',
  double: '×2',
  half: '÷2',
  plusAll: '++4',
  target4: '+4T',
  minus1: '−1',
  replay: '⟲',
  dice4: 'D4',
  dice6: 'D6',
  dice8: 'D8',
  dice12: 'D12',
  dice20: 'D20',
  eye: '👁',
  swap: '⇆',
  joker: '🃏',
  rotate: '⟳',
  draw1: '+1',
  flip: '⇅',
  wildDraw2: '+2',
  draw5: '+5',
  skipAll: '⊘⊘',
  wildDrawColor: '+🎨',
};

export const symbolOf = (card: UnoCardFace) => VALUE_SYMBOL[card.value] ?? card.value;

/** Cartas que piden elegir a otro jugador al jugarlas. */
export const TARGETED_VALUES = ['target4', 'eye', 'swap'];
