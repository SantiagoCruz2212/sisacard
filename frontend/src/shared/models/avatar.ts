// Debe coincidir con backend/games-core/src/domain/avatar.ts (el servidor valida estos valores).
export const HAIR_STYLES = ['short', 'long', 'spiky', 'bob', 'bun', 'bald'] as const;
export const EYE_STYLES = ['normal', 'sleepy', 'angry', 'happy'] as const;
export const MOUTH_STYLES = ['smile', 'neutral', 'grin', 'open', 'frown'] as const;
export const CLOTHES_STYLES = ['tshirt', 'vest', 'hoodie', 'suit'] as const;

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

/** Paletas: el personaje guarda solo el índice, así el servidor valida sin conocer los colores. */
export const PALETTE = {
  skin: ['#f6d5b8', '#eab98f', '#d39a6a', '#b57a4c', '#8a5a3a', '#5e3b25'],
  hairColor: ['#2a1d17', '#5b3a29', '#8a5a2b', '#c8a23a', '#d9d9d9', '#b5412c', '#3b4a8a', '#c44fa0'],
  eyeColor: ['#4a2f1b', '#2f6e4a', '#2d5fa8', '#6b6b6b', '#7a3b8c', '#1a1a1a'],
  clothesColor: ['#3b5b8c', '#c0392b', '#2f7d4f', '#d4a020', '#6b3fa0', '#2b2b33', '#e07b39', '#4aa3a8'],
} as const;

export const randomAvatar = (): Avatar => {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)] as T;
  const idx = (n: number) => Math.floor(Math.random() * n);
  return {
    hair: pick(HAIR_STYLES),
    hairColor: idx(PALETTE.hairColor.length),
    skin: idx(PALETTE.skin.length),
    eyes: pick(EYE_STYLES),
    eyeColor: idx(PALETTE.eyeColor.length),
    mouth: pick(MOUTH_STYLES),
    clothes: pick(CLOTHES_STYLES),
    clothesColor: idx(PALETTE.clothesColor.length),
  };
};
