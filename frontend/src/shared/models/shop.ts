import type { Avatar, HumanAvatar } from '@/shared/models/avatar';

export type ShopKind = 'hair' | 'hat' | 'glasses' | 'accessory' | 'clothes' | 'pet';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  value: string;
  price: number;
}

export interface ShopState {
  coins: number;
  owned: string[];
  items: ShopItem[];
}

export const SHOP_KINDS: ShopKind[] = ['hair', 'hat', 'glasses', 'accessory', 'clothes', 'pet'];

export const itemId = (kind: ShopKind, value: string) => `${kind}:${value}`;

/** Cómo se vería el personaje con ese objeto puesto (vista previa de la tienda). */
export function withItem(avatar: HumanAvatar, item: ShopItem): HumanAvatar {
  const next = { ...avatar, [item.kind]: item.value } as HumanAvatar;
  if (item.kind === 'hat' && next.hatColor === undefined) next.hatColor = 0;
  return next;
}

export const isHuman = (a: Avatar | undefined): a is HumanAvatar => Boolean(a && a.sex !== 'nonbinary');
