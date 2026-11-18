import { DomainError } from './shared.js';

export const HAIR_STYLES = ['short', 'long', 'spiky', 'bob', 'bun', 'bald'] as const;
export const EYE_STYLES = ['normal', 'sleepy', 'angry', 'happy'] as const;
export const MOUTH_STYLES = ['smile', 'neutral', 'grin', 'open', 'frown'] as const;
export const CLOTHES_STYLES = ['tshirt', 'vest', 'hoodie', 'suit'] as const;

/** Cantidad de colores de cada paleta (los colores en sí se definen en el frontend). */
export const PALETTE_SIZE = { hairColor: 8, skin: 6, eyeColor: 6, clothesColor: 8 } as const;

export interface Avatar {
  hair: (typeof HAIR_STYLES)[number];
  hairColor: number;
  skin: number;
  eyes: (typeof EYE_STYLES)[number];
  eyeColor: number;
  mouth: (typeof MOUTH_STYLES)[number];
  clothes: (typeof CLOTHES_STYLES)[number];
  clothesColor: number;
}

function oneOf<T extends string>(list: readonly T[], value: unknown, field: string): T {
  if (typeof value === 'string' && (list as readonly string[]).includes(value)) return value as T;
  throw new DomainError(`Personaje inválido: ${field}`);
}

function paletteIndex(value: unknown, size: number, field: string): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size) return value;
  throw new DomainError(`Personaje inválido: ${field}`);
}

/** Valida lo que llega de fuera: solo estilos y colores conocidos. */
export function parseAvatar(raw: unknown): Avatar {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    hair: oneOf(HAIR_STYLES, r.hair, 'hair'),
    hairColor: paletteIndex(r.hairColor, PALETTE_SIZE.hairColor, 'hairColor'),
    skin: paletteIndex(r.skin, PALETTE_SIZE.skin, 'skin'),
    eyes: oneOf(EYE_STYLES, r.eyes, 'eyes'),
    eyeColor: paletteIndex(r.eyeColor, PALETTE_SIZE.eyeColor, 'eyeColor'),
    mouth: oneOf(MOUTH_STYLES, r.mouth, 'mouth'),
    clothes: oneOf(CLOTHES_STYLES, r.clothes, 'clothes'),
    clothesColor: paletteIndex(r.clothesColor, PALETTE_SIZE.clothesColor, 'clothesColor'),
  };
}

/** Personaje por defecto, siempre el mismo para un mismo usuario: así todos se ven en la mesa desde el primer día. */
export function defaultAvatar(seed: string): Avatar {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let x = h || 1;
  const next = (n: number) => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x % n;
  };
  return {
    hair: HAIR_STYLES[next(HAIR_STYLES.length)] as Avatar['hair'],
    hairColor: next(PALETTE_SIZE.hairColor),
    skin: next(PALETTE_SIZE.skin),
    eyes: EYE_STYLES[next(EYE_STYLES.length)] as Avatar['eyes'],
    eyeColor: next(PALETTE_SIZE.eyeColor),
    mouth: MOUTH_STYLES[next(MOUTH_STYLES.length)] as Avatar['mouth'],
    clothes: CLOTHES_STYLES[next(CLOTHES_STYLES.length)] as Avatar['clothes'],
    clothesColor: next(PALETTE_SIZE.clothesColor),
  };
}
