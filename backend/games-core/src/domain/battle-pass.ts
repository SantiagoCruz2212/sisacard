import type { ShopItem, ShopKind } from './shop.js';

/** Precio del pase de batalla en monedas (compra única). */
export const PASS_PRICE = 100;
/** Se guarda como una compra más con este id. */
export const PASS_ID = 'pass:season1';
export const XP_PER_LEVEL = 100;

export interface PassTier {
  tier: number;
  kind: ShopKind;
  value: string;
}

/** 10 objetos exclusivos: el nivel N desbloquea el escalón N (solo con el pase comprado). */
export const PASS_TIERS: readonly PassTier[] = [
  { tier: 1, kind: 'pet', value: 'panda' },
  { tier: 2, kind: 'hat', value: 'pirate' },
  { tier: 3, kind: 'glasses', value: 'visor' },
  { tier: 4, kind: 'accessory', value: 'medal' },
  { tier: 5, kind: 'hat', value: 'wizard' },
  { tier: 6, kind: 'clothes', value: 'robe' },
  { tier: 7, kind: 'pet', value: 'owl' },
  { tier: 8, kind: 'hat', value: 'viking' },
  { tier: 9, kind: 'accessory', value: 'halo' },
  { tier: 10, kind: 'pet', value: 'phoenix' },
];

export const passItemId = (t: PassTier) => `${t.kind}:${t.value}`;

/** Los objetos del pase como "objetos de pago": solo se pueden llevar si el escalón está desbloqueado. */
export const PASS_ITEMS: readonly ShopItem[] = PASS_TIERS.map((t) => ({ id: passItemId(t), kind: t.kind, value: t.value, price: 0 }));

export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL);

/** Experiencia de una partida: por jugar, por los puntos y un extra por ganar. */
export function xpForResult(place: number, total: number, points: number) {
  return 20 + points * 2 + (place === 1 && total > 1 ? 20 : 0);
}

/** Ids de los objetos del pase que ya se pueden usar. */
export function unlockedPassItems(hasPass: boolean, xp: number): string[] {
  if (!hasPass) return [];
  const level = levelOf(xp);
  return PASS_TIERS.filter((t) => t.tier <= level).map(passItemId);
}
