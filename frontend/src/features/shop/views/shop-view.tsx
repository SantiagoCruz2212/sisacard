import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShopState } from '@/shared/hooks/use-shop-state';
import { http } from '@/shared/lib/http';
import { buyBattlePass, buyShopItem } from '@/shared/lib/shop-api';
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

  const buyPass = useMutation({
    mutationFn: buyBattlePass,
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
        {shop && (
          <section className="mb-6 rounded-xl border border-primary/40 p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">🎖️ {t('shop.pass.title')}</h3>
              {shop.pass.owned ? (
                <span className="text-sm text-good">✔ {t('shop.pass.owned')}</span>
              ) : (
                <Button variant="primary" disabled={shop.coins < shop.pass.price || buyPass.isPending} onClick={() => buyPass.mutate()}>
                  {t('shop.pass.buy', { price: shop.pass.price })}
                </Button>
              )}
            </div>
            <p className="mb-2 text-xs text-muted">{t('shop.pass.help')}</p>
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <b className="text-fg">{t('shop.pass.level', { level: shop.level })}</b>
                <span>{t('shop.pass.xp', { xp: shop.xp % shop.xpPerLevel, next: shop.xpPerLevel })}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-line">
                <div className="h-full bg-primary transition-all" style={{ width: `${((shop.xp % shop.xpPerLevel) / shop.xpPerLevel) * 100}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {shop.pass.tiers.map((tier) => (
                <div key={tier.tier} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${tier.unlocked ? 'border-good' : 'border-line opacity-80'}`}>
                  <span className="text-xs text-muted">{t('shop.pass.tier', { tier: tier.tier })}</span>
                  <div className="rounded-lg bg-table p-1">
                    <LowPolyAvatar avatar={withItem(base, { id: tier.itemId, kind: tier.kind, value: tier.value, price: 0 })} size={72} label={tier.itemId} />
                  </div>
                  <b className="text-sm">{(t as (key: string) => string)(`character.styles.${tier.kind}.${tier.value}`)}</b>
                  <span className={`text-xs ${tier.unlocked ? 'text-good' : 'text-muted'}`}>
                    {tier.unlocked ? `✔ ${t('shop.pass.unlocked')}` : shop.pass.owned ? `🔒 ${t('shop.pass.lockedLevel', { tier: tier.tier })}` : `🔒 ${t('shop.pass.lockedPass')}`}
                  </span>
                </div>
              ))}
            </div>
            {buyPass.error && <p className="mt-2 text-sm text-bad">{buyPass.error.message}</p>}
          </section>
        )}
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
