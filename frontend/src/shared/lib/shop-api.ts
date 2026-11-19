import { http } from '@/shared/lib/http';
import type { ShopState } from '@/shared/models/shop';

export const fetchShop = () => http<ShopState>('/api/games/shop/me');

export const buyShopItem = (itemId: string) => http<ShopState>('/api/games/shop/buy', { body: { itemId } });
