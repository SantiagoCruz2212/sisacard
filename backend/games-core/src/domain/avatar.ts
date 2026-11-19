import { DomainError } from './shared.js';

export const SEXES = ['male', 'female', 'nonbinary'] as const;
export const HAIR_STYLES = ['short', 'long', 'spiky', 'bob', 'bun', 'bald', 'ponytail', 'afro', 'mohawk', 'curly', 'buzz', 'pigtails', 'sidepart'] as const;
export const EYE_STYLES = ['normal', 'sleepy', 'angry', 'happy', 'wink', 'surprised'] as const;
export const MOUTH_STYLES = ['smile', 'neutral', 'grin', 'open', 'frown', 'smirk', 'tongue'] as const;
export const CLOTHES_STYLES = ['tshirt', 'vest', 'hoodie', 'suit', 'dress', 'armor', 'sweater'] as const;
export const HAT_STYLES = ['none', 'cap', 'beanie', 'tophat', 'crown', 'headband'] as const;
export const GLASSES_STYLES = ['none', 'round', 'square', 'sunglasses', 'monocle'] as const;
export const BEARD_STYLES = ['none', 'stubble', 'mustache', 'goatee', 'beard'] as const;
export const ACCESSORY_STYLES = ['none', 'earring', 'necklace', 'scarf', 'bowtie', 'eyepatch', 'headphones'] as const;
export const PET_STYLES = ['none', 'dog', 'cat', 'rabbit', 'parrot', 'dragon'] as const;
export const VEHICLES = ['apache', 'motorcycle'] as const;

/** Cantidad de colores de cada paleta (los colores en sí se definen en el frontend). */
export const PALETTE_SIZE = { hairColor: 12, skin: 8, eyeColor: 6, clothesColor: 12, hatColor: 12 } as const;

export interface HumanAvatar {
  sex: 'male' | 'female';
  hair: (typeof HAIR_STYLES)[number];
  hairColor: number;
  skin: number;
  eyes: (typeof EYE_STYLES)[number];
  eyeColor: number;
  mouth: (typeof MOUTH_STYLES)[number];
  clothes: (typeof CLOTHES_STYLES)[number];
  clothesColor: number;
  hat: (typeof HAT_STYLES)[number];
  hatColor: number;
  glasses: (typeof GLASSES_STYLES)[number];
  /** Solo aplica a hombres; en mujeres siempre es 'none'. */
  beard: (typeof BEARD_STYLES)[number];
  accessory: (typeof ACCESSORY_STYLES)[number];
  /** Mascota que acompaña al personaje (se compra en la tienda). */
  pet: (typeof PET_STYLES)[number];
}

/** Quien elige "no binario" no personaliza un cuerpo: elige un vehículo. */
export interface VehicleAvatar {
  sex: 'nonbinary';
  vehicle: (typeof VEHICLES)[number];
}

export type Avatar = HumanAvatar | VehicleAvatar;

function oneOf<T extends string>(list: readonly T[], value: unknown, field: string): T {
  if (typeof value === 'string' && (list as readonly string[]).includes(value)) return value as T;
  throw new DomainError(`Personaje inválido: ${field}`);
}

/** Si el campo no viene se usa el valor por defecto (así los personajes guardados antes de los accesorios siguen siendo válidos). */
function oneOfOr<T extends string>(list: readonly T[], value: unknown, fallback: T, field: string): T {
  return value === undefined ? fallback : oneOf(list, value, field);
}

function paletteIndex(value: unknown, size: number, field: string): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size) return value;
  throw new DomainError(`Personaje inválido: ${field}`);
}

function paletteIndexOr(value: unknown, size: number, fallback: number, field: string): number {
  return value === undefined ? fallback : paletteIndex(value, size, field);
}

/** Valida lo que llega de fuera: solo estilos y colores conocidos. */
export function parseAvatar(raw: unknown): Avatar {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sex = oneOfOr(SEXES, r.sex, 'male', 'sex');

  if (sex === 'nonbinary') {
    // Solo se conserva el vehículo: cualquier otro campo se descarta.
    return { sex, vehicle: oneOfOr(VEHICLES, r.vehicle, 'apache', 'vehicle') };
  }

  return {
    sex,
    hair: oneOf(HAIR_STYLES, r.hair, 'hair'),
    hairColor: paletteIndex(r.hairColor, PALETTE_SIZE.hairColor, 'hairColor'),
    skin: paletteIndex(r.skin, PALETTE_SIZE.skin, 'skin'),
    eyes: oneOf(EYE_STYLES, r.eyes, 'eyes'),
    eyeColor: paletteIndex(r.eyeColor, PALETTE_SIZE.eyeColor, 'eyeColor'),
    mouth: oneOf(MOUTH_STYLES, r.mouth, 'mouth'),
    clothes: oneOf(CLOTHES_STYLES, r.clothes, 'clothes'),
    clothesColor: paletteIndex(r.clothesColor, PALETTE_SIZE.clothesColor, 'clothesColor'),
    hat: oneOfOr(HAT_STYLES, r.hat, 'none', 'hat'),
    hatColor: paletteIndexOr(r.hatColor, PALETTE_SIZE.hatColor, 0, 'hatColor'),
    glasses: oneOfOr(GLASSES_STYLES, r.glasses, 'none', 'glasses'),
    beard: sex === 'male' ? oneOfOr(BEARD_STYLES, r.beard, 'none', 'beard') : 'none',
    accessory: oneOfOr(ACCESSORY_STYLES, r.accessory, 'none', 'accessory'),
    pet: oneOfOr(PET_STYLES, r.pet, 'none', 'pet'),
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
  const pick = <T,>(list: readonly T[]) => list[next(list.length)] as T;
  // La mayoría de los accesorios empiezan apagados para que los personajes por defecto se vean limpios.
  const maybe = <T,>(list: readonly T[], none: T, chance: number) => (next(100) < chance ? pick(list) : none);

  const sex = pick(['male', 'female'] as const);
  return {
    sex,
    hair: pick(HAIR_STYLES),
    hairColor: next(PALETTE_SIZE.hairColor),
    skin: next(PALETTE_SIZE.skin),
    eyes: pick(EYE_STYLES),
    eyeColor: next(PALETTE_SIZE.eyeColor),
    mouth: pick(MOUTH_STYLES),
    clothes: pick(CLOTHES_STYLES),
    clothesColor: next(PALETTE_SIZE.clothesColor),
    hat: maybe(HAT_STYLES.slice(1), 'none', 25),
    hatColor: next(PALETTE_SIZE.hatColor),
    glasses: maybe(GLASSES_STYLES.slice(1), 'none', 25),
    beard: sex === 'male' ? maybe(BEARD_STYLES.slice(1), 'none', 35) : 'none',
    accessory: maybe(ACCESSORY_STYLES.slice(1), 'none', 25),
    pet: 'none',
  };
}
