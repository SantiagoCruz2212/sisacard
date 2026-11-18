import type { UnoCard, UnoColor } from '@/shared/models/realtime';

// Las clases se escriben completas para que Tailwind las detecte.
export const CARD_COLOR_CLASS: Record<UnoCard['color'], string> = {
  red: 'bg-uno-red text-white',
  yellow: 'bg-uno-yellow text-black',
  green: 'bg-uno-green text-white',
  blue: 'bg-uno-blue text-white',
  wild: 'bg-uno-wild text-white ring-1 ring-white/30',
};

export const DOT_COLOR_CLASS: Record<UnoColor, string> = {
  red: 'bg-uno-red',
  yellow: 'bg-uno-yellow',
  green: 'bg-uno-green',
  blue: 'bg-uno-blue',
};

export const COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];

export const VALUE_SYMBOL: Record<string, string> = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: '★',
  wild4: '+4',
};

export const symbolOf = (card: UnoCard) => VALUE_SYMBOL[card.value] ?? card.value;
