import { useQuery } from '@tanstack/react-query';
import { fetchShop } from '@/shared/lib/shop-api';
import { useSession } from '@/shared/hooks/use-session';

/** Monedas, objetos comprados y catálogo del jugador (lo comparten el lobby, la tienda y el editor de personaje). */
export function useShopState() {
  const { user } = useSession();
  const query = useQuery({ queryKey: ['shop', user?.id], queryFn: fetchShop, refetchOnMount: 'always', enabled: Boolean(user) });
  return { shop: query.data, isLoading: query.isLoading, userId: user?.id };
}
