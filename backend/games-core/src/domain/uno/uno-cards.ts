/** Cartas del UNO: colores, valores, barajas (clásica, Infinity y Flip) y reglas de emparejar. */

export const LIGHT_COLORS = ['red', 'yellow', 'green', 'blue'] as const;
export const DARK_COLORS = ['pink', 'teal', 'orange', 'purple'] as const;
/** Colores del lado claro (y de las barajas clásica e Infinity). */
export const COLORS: UnoColor[] = [...LIGHT_COLORS];

export type UnoColor = (typeof LIGHT_COLORS)[number] | (typeof DARK_COLORS)[number];
export type UnoSide = 'light' | 'dark';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export type UnoDigit = (typeof DIGITS)[number];

export type UnoValue =
  | UnoDigit
  // clásicas
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4'
  // Infinity
  | 'number' // carta # (de color o comodín): vale el número que elijas
  | 'draw4' // +4 de color
  | 'double' // x2: el siguiente roba tantas cartas como tiene
  | 'half' // /2: descartas la mitad de tu mano (tú eliges cuáles)
  | 'plusAll' // ++4: todos los demás roban 4 y vuelves a jugar
  | 'target4' // +4T: eliges quién roba 4
  | 'minus1' // -1: descartas una carta más
  | 'replay' // vuelves a jugar
  | 'dice4'
  | 'dice6'
  | 'dice8'
  | 'dice12'
  | 'dice20'
  | 'eye' // ves la mano de alguien
  | 'swap' // cambias tu mano con alguien
  | 'joker' // sin efecto: se juega cuando sea, incluso fuera de turno
  | 'rotate' // todas las manos pasan al siguiente en el sentido del juego
  // Flip
  | 'draw1'
  | 'flip'
  | 'wildDraw2'
  | 'draw5'
  | 'skipAll'
  | 'wildDrawColor';

export interface CardFace {
  color: UnoColor | 'wild';
  value: UnoValue;
}

/** Una carta física. En UNO Flip `dark` es su otra cara; en las demás barajas no existe. */
export interface UnoCard extends CardFace {
  id: number;
  dark?: CardFace;
}

export const isDigit = (v: UnoValue): v is UnoDigit => (DIGITS as readonly string[]).includes(v);
export const isUnoDigit = (v: unknown): v is UnoDigit => typeof v === 'string' && (DIGITS as readonly string[]).includes(v);

/** Cartas de robo que se pueden apilar y cuánto suman. */
export const DRAW_AMOUNT: Partial<Record<UnoValue, number>> = {
  draw1: 1,
  draw2: 2,
  wildDraw2: 2,
  draw4: 4,
  wild4: 4,
  draw5: 5,
};

/** Comodines de robo que se pueden desafiar (solo son legales si no tenías el color en juego). */
export const CHALLENGEABLE: UnoValue[] = ['wild4', 'wildDraw2'];

export const DICE_SIDES: Partial<Record<UnoValue, number>> = { dice4: 4, dice6: 6, dice8: 8, dice12: 12, dice20: 20 };

/** Cartas que obligan a elegir a otro jugador al jugarlas. */
export const TARGETED: UnoValue[] = ['target4', 'eye', 'swap'];

export const faceOf = (card: UnoCard, side: UnoSide): CardFace => (side === 'dark' && card.dark ? card.dark : card);

export const colorsOf = (side: UnoSide): UnoColor[] => (side === 'dark' ? [...DARK_COLORS] : [...LIGHT_COLORS]);

/**
 * ¿Se puede jugar esta cara sobre la mesa?
 * `value` es el valor vigente (el número elegido con #, o lo que había antes de un comodín sin efecto).
 */
export function matches(face: CardFace, value: UnoValue, color: UnoColor): boolean {
  if (face.color === 'wild') return true;
  if (face.color === color) return true;
  // La # de color hace de cualquier número: entra sobre cualquier carta numérica.
  if (face.value === 'number') return isDigit(value);
  return face.value === value;
}

// ---------- barajas ----------

const NUMBERS_1_9: UnoValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Baraja oficial de 108 cartas. */
export function buildClassicDeck(): UnoCard[] {
  let id = 0;
  const deck: UnoCard[] = [];
  for (const color of LIGHT_COLORS) {
    deck.push({ id: id++, color, value: '0' });
    for (const value of [...NUMBERS_1_9, 'skip', 'reverse', 'draw2'] as UnoValue[]) {
      deck.push({ id: id++, color, value });
      deck.push({ id: id++, color, value });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: 'wild', value: 'wild' });
    deck.push({ id: id++, color: 'wild', value: 'wild4' });
  }
  return deck;
}

/** Las 39 cartas de UNO Infinity, en los colores del lado que toque. */
export function infinityFaces(colors: readonly UnoColor[]): CardFace[] {
  const faces: CardFace[] = [];
  const add = (color: UnoColor | 'wild', value: UnoValue, copies = 1) => {
    for (let i = 0; i < copies; i++) faces.push({ color, value });
  };
  for (const color of colors) {
    add(color, 'number');
    add(color, 'draw4');
    add(color, 'minus1');
    add(color, 'replay');
  }
  add('wild', 'number', 2);
  add('wild', 'double', 2);
  add('wild', 'half', 2);
  add('wild', 'plusAll');
  add('wild', 'target4', 2);
  add('wild', 'replay');
  for (const dice of ['dice4', 'dice6', 'dice8', 'dice12', 'dice20'] as UnoValue[]) add('wild', dice);
  add('wild', 'eye', 2);
  add('wild', 'swap', 2);
  add('wild', 'joker', 2);
  add('wild', 'rotate', 2);
  return faces;
}

/** Baraja clásica más las cartas de UNO Infinity (147 cartas). */
export function buildInfinityDeck(): UnoCard[] {
  const deck = buildClassicDeck();
  return [...deck, ...infinityFaces(LIGHT_COLORS).map((face, i) => ({ id: deck.length + i, ...face }))];
}

function flipFaces(colors: readonly UnoColor[], actions: UnoValue[], wilds: UnoValue[], flipsPerColor: number): CardFace[] {
  const faces: CardFace[] = [];
  for (const color of colors) {
    for (const value of [...NUMBERS_1_9, ...actions]) {
      faces.push({ color, value }, { color, value });
    }
    for (let i = 0; i < flipsPerColor; i++) faces.push({ color, value: 'flip' });
  }
  for (const value of wilds) for (let i = 0; i < 4; i++) faces.push({ color: 'wild', value });
  return faces;
}

/**
 * UNO Flip: 112 cartas de dos caras. Cada lado claro va pegado a un lado oscuro al azar
 * (`shuffle` decide el emparejamiento).
 *
 * Con `withInfinity` cada lado suma las 39 cartas Infinity en sus propios colores y una Flip más por
 * color (para que la mesa se siga volteando seguido con el mazo más grande): 155 cartas.
 */
export function buildFlipDeck(shuffle: <T>(a: T[]) => T[], withInfinity = false): UnoCard[] {
  const flips = withInfinity ? 3 : 2;
  const side = (colors: readonly UnoColor[], actions: UnoValue[], wilds: UnoValue[]) => [
    ...flipFaces(colors, actions, wilds, flips),
    ...(withInfinity ? infinityFaces(colors) : []),
  ];
  const light = side(LIGHT_COLORS, ['draw1', 'reverse', 'skip'], ['wild', 'wildDraw2']);
  const dark = shuffle(side(DARK_COLORS, ['draw5', 'reverse', 'skipAll'], ['wild', 'wildDrawColor']));
  return light.map((face, id) => ({ id, ...face, dark: dark[id] as CardFace }));
}
