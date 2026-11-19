import { http } from '@/shared/lib/http';
import type { ShopState } from '@/shared/models/shop';

export const fetchShop = () => http<ShopState>('/api/games/shop/me');

export const buyBattlePass = () => http<ShopState>('/api/games/shop/pass', { body: {} });

export const buyShopItem = (itemId: string) => http<ShopState>('/api/games/shop/buy', { body: { itemId } });
