import type { Avatar } from './avatar.js';

export type ShopKind = 'hair' | 'hat' | 'glasses' | 'accessory' | 'clothes' | 'pet';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  value: string;
  price: number;
}

/** Monedas extra para quien gana una partida (de 2 o más jugadores). */
export const WIN_BONUS_COINS = 5;

export const itemId = (kind: ShopKind, value: string) => `${kind}:${value}`;

const item = (kind: ShopKind, value: string, price: number): ShopItem => ({ id: itemId(kind, value), kind, value, price });

/** Catálogo: lo que no está aquí es gratis. Los precios están en monedas (una victoria da ~15). */
export const SHOP_ITEMS: readonly ShopItem[] = [
  item('hair', 'curly', 50),
  item('hair', 'pigtails', 50),
  item('hair', 'afro', 60),
  item('hair', 'mohawk', 80),
  item('hat', 'beanie', 40),
  item('hat', 'tophat', 100),
  item('hat', 'crown', 250),
  item('glasses', 'sunglasses', 60),
  item('glasses', 'monocle', 120),
  item('accessory', 'earring', 30),
  item('accessory', 'scarf', 40),
  item('accessory', 'bowtie', 40),
  item('accessory', 'necklace', 50),
  item('accessory', 'eyepatch', 60),
  item('accessory', 'headphones', 80),
  item('clothes', 'suit', 100),
  item('clothes', 'armor', 180),
  item('pet', 'cat', 70),
  item('pet', 'dog', 70),
  item('pet', 'rabbit', 90),
  item('pet', 'parrot', 110),
  item('pet', 'dragon', 300),
];

export const findItem = (id: unknown) => SHOP_ITEMS.find((i) => i.id === id);

/** Objetos de pago que usa un personaje (los vehículos del no binario son gratis). */
export function premiumItemsIn(avatar: Avatar): ShopItem[] {
  if (avatar.sex === 'nonbinary') return [];
  const used = [
    itemId('hair', avatar.hair),
    itemId('hat', avatar.hat),
    itemId('glasses', avatar.glasses),
    itemId('accessory', avatar.accessory),
    itemId('clothes', avatar.clothes),
    itemId('pet', avatar.pet),
  ];
  return SHOP_ITEMS.filter((i) => used.includes(i.id));
}
