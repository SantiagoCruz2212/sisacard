import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShopState } from '@/shared/hooks/use-shop-state';
import { http } from '@/shared/lib/http';
import { buyShopItem } from '@/shared/lib/shop-api';
import { DEFAULT_HUMAN, type Avatar } from '@/shared/models/avatar';
import { isHuman, SHOP_KINDS, withItem, type ShopItem } from '@/shared/models/shop';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';
import { Page } from '@/shared/ui/page';

/** Tienda de objetos: se pagan con las monedas que se ganan jugando. */
export function ShopView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { shop, isLoading, userId } = useShopState();
  const avatarQuery = useQuery({
    queryKey: ['avatar', userId],
    queryFn: () => http<{ avatar: Avatar }>('/api/games/avatar/me').then((r) => r.avatar),
  });
  const buy = useMutation({
    mutationFn: buyShopItem,
    onSuccess: (state) => queryClient.setQueryData(['shop', userId], state),
  });

  const mine = avatarQuery.data;
  // Vista previa sobre tu personaje (si eres no binario, sobre uno de muestra).
  const base = isHuman(mine) ? mine : DEFAULT_HUMAN;
  const owned = new Set(shop?.owned ?? []);

  return (
    <Page>
      <Link to="/" className="mb-3 inline-block text-sm text-muted">
        ← {t('common.back')}
      </Link>
      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">🛒 {t('shop.title')}</h2>
          <span className="rounded-full bg-line px-3 py-1 text-sm font-semibold">🪙 {t('shop.coins', { count: shop?.coins ?? 0 })}</span>
        </div>
        <p className="mb-4 text-sm text-muted">{t('shop.help')}</p>
        {isLoading || !shop ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : (
          SHOP_KINDS.map((kind) => (
            <section key={kind} className="mb-5">
              <h3 className="mb-2 text-base font-semibold">{t(`shop.kinds.${kind}`)}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {shop.items
                  .filter((i) => i.kind === kind)
                  .map((item: ShopItem) => {
                    const have = owned.has(item.id);
                    const afford = shop.coins >= item.price;
                    return (
                      <div key={item.id} className="flex flex-col items-center gap-1 rounded-xl border border-line p-2 text-center">
                        <div className="rounded-lg bg-table p-1">
                          <LowPolyAvatar avatar={withItem(base, item)} size={84} label={item.id} />
                        </div>
                        <b className="text-sm">{(t as (key: string) => string)(`character.styles.${kind}.${item.value}`)}</b>
                        {have ? (
                          <span className="text-sm text-good">✔ {t('shop.owned')}</span>
                        ) : (
                          <Button variant="primary" disabled={!afford || buy.isPending} onClick={() => buy.mutate(item.id)}>
                            🪙 {item.price}
                          </Button>
                        )}
                        {!have && !afford && <span className="text-xs text-muted">{t('shop.notEnough')}</span>}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))
        )}
        {buy.error && <p className="text-sm text-bad">{buy.error.message}</p>}
      </Card>
    </Page>
  );
}
