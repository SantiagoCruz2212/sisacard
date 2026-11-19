// Debe coincidir con backend/games-core/src/domain/avatar.ts (el servidor valida estos valores).
export const SEXES = ['male', 'female', 'nonbinary'] as const;
export const HAIR_STYLES = ['short', 'long', 'spiky', 'bob', 'bun', 'bald', 'ponytail', 'afro', 'mohawk', 'curly', 'buzz', 'pigtails', 'sidepart'] as const;
export const EYE_STYLES = ['normal', 'sleepy', 'angry', 'happy', 'wink', 'surprised'] as const;
export const MOUTH_STYLES = ['smile', 'neutral', 'grin', 'open', 'frown', 'smirk', 'tongue'] as const;
export const CLOTHES_STYLES = ['tshirt', 'vest', 'hoodie', 'suit', 'dress', 'armor', 'sweater', 'robe'] as const;
export const HAT_STYLES = ['none', 'cap', 'beanie', 'tophat', 'crown', 'headband', 'wizard', 'pirate', 'viking'] as const;
export const GLASSES_STYLES = ['none', 'round', 'square', 'sunglasses', 'monocle', 'visor'] as const;
export const BEARD_STYLES = ['none', 'stubble', 'mustache', 'goatee', 'beard'] as const;
export const ACCESSORY_STYLES = ['none', 'earring', 'necklace', 'scarf', 'bowtie', 'eyepatch', 'headphones', 'medal', 'halo'] as const;
export const PET_STYLES = ['none', 'dog', 'cat', 'rabbit', 'parrot', 'dragon', 'panda', 'owl', 'phoenix', 'bear'] as const;
export const VEHICLES = ['apache', 'motorcycle'] as const;

export type Sex = (typeof SEXES)[number];
export type Vehicle = (typeof VEHICLES)[number];

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
  beard: (typeof BEARD_STYLES)[number];
  accessory: (typeof ACCESSORY_STYLES)[number];
  pet: (typeof PET_STYLES)[number];
}

/** "No binario" no personaliza un cuerpo: se elige un vehículo. */
export interface VehicleAvatar {
  sex: 'nonbinary';
  vehicle: Vehicle;
}

export type Avatar = HumanAvatar | VehicleAvatar;

/** Paletas: el personaje guarda solo el índice, así el servidor valida sin conocer los colores. */
export const PALETTE = {
  skin: ['#f6d5b8', '#eab98f', '#d39a6a', '#b57a4c', '#8a5a3a', '#5e3b25', '#fde7d4', '#9ccfa4'],
  hairColor: ['#2a1d17', '#5b3a29', '#8a5a2b', '#c8a23a', '#d9d9d9', '#b5412c', '#3b4a8a', '#c44fa0', '#2a9d8f', '#e76f51', '#a98bd9', '#e9d28a'],
  eyeColor: ['#4a2f1b', '#2f6e4a', '#2d5fa8', '#6b6b6b', '#7a3b8c', '#1a1a1a'],
  clothesColor: ['#3b5b8c', '#c0392b', '#2f7d4f', '#d4a020', '#6b3fa0', '#2b2b33', '#e07b39', '#4aa3a8', '#f2f2f2', '#7a1f3d', '#1f3d7a', '#8bc34a'],
} as const;

/** El sombrero usa la misma paleta que la ropa. */
export const HAT_PALETTE = PALETTE.clothesColor;

/** Personaje humano base (útil como punto de partida y en pruebas). */
export const DEFAULT_HUMAN: HumanAvatar = {
  sex: 'male',
  hair: 'short',
  hairColor: 1,
  skin: 1,
  eyes: 'normal',
  eyeColor: 0,
  mouth: 'smile',
  clothes: 'tshirt',
  clothesColor: 0,
  hat: 'none',
  hatColor: 0,
  glasses: 'none',
  beard: 'none',
  accessory: 'none',
  pet: 'none',
};

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)] as T;
const idx = (n: number) => Math.floor(Math.random() * n);

export const randomHuman = (sex: 'male' | 'female' = pick(['male', 'female'] as const)): HumanAvatar => ({
  sex,
  hair: pick(HAIR_STYLES),
  hairColor: idx(PALETTE.hairColor.length),
  skin: idx(PALETTE.skin.length),
  eyes: pick(EYE_STYLES),
  eyeColor: idx(PALETTE.eyeColor.length),
  mouth: pick(MOUTH_STYLES),
  clothes: pick(CLOTHES_STYLES),
  clothesColor: idx(PALETTE.clothesColor.length),
  hat: Math.random() < 0.3 ? pick(HAT_STYLES.slice(1)) : 'none',
  hatColor: idx(HAT_PALETTE.length),
  glasses: Math.random() < 0.3 ? pick(GLASSES_STYLES.slice(1)) : 'none',
  beard: sex === 'male' && Math.random() < 0.4 ? pick(BEARD_STYLES.slice(1)) : 'none',
  accessory: Math.random() < 0.3 ? pick(ACCESSORY_STYLES.slice(1)) : 'none',
  pet: 'none',
});

export const randomAvatar = (): Avatar => randomHuman();
