import { describe, expect, it } from 'vitest';
import { defaultAvatar, type Avatar, type HumanAvatar } from '../domain/avatar.js';
import { SHOP_ITEMS, WIN_BONUS_COINS } from '../domain/shop.js';
import { RecordGameStats } from './record-game-stats.js';
import type { AvatarDirectory, StatsRepository, WalletRepository } from './ports.js';
import { levelOf, PASS_PRICE, PASS_TIERS, xpForResult } from '../domain/battle-pass.js';
import { BuyBattlePass, BuyItem, shopView, UpdateAvatar } from './use-cases.js';

class FakeWallet implements WalletRepository {
  coins = new Map<string, number>();
  items = new Map<string, Set<string>>();
  balance = (u: string) => this.coins.get(u) ?? 0;
  credit = (u: string, n: number) => void this.coins.set(u, this.balance(u) + n);
  owned = (u: string) => [...(this.items.get(u) ?? [])];
  xps = new Map<string, number>();
  xp = (u: string) => this.xps.get(u) ?? 0;
  addXp = (u: string, n: number) => void this.xps.set(u, this.xp(u) + n);
  purchase(u: string, item: string, price: number) {
    if (this.balance(u) < price) return false;
    this.coins.set(u, this.balance(u) - price);
    this.items.set(u, (this.items.get(u) ?? new Set()).add(item));
    return true;
  }
}

const base: HumanAvatar = {
  ...(defaultAvatar('x') as HumanAvatar),
  sex: 'male',
  hair: 'short',
  hat: 'none',
  glasses: 'none',
  accessory: 'none',
  clothes: 'tshirt',
  beard: 'none',
};

class FakeAvatars implements AvatarDirectory {
  map = new Map<string, Avatar>();
  get = (u: string) => this.map.get(u) ?? base;
  set = (u: string, a: Avatar) => void this.map.set(u, a);
}

const noStats = { increment: async () => {}, rememberPlayer: async () => {} } as unknown as StatsRepository;

describe('monedas y tienda', () => {
  it('al terminar una partida cada jugador gana los puntos como monedas y el ganador un extra', async () => {
    const wallet = new FakeWallet();
    await new RecordGameStats(noStats, wallet).handle({
      game: 'roulette',
      players: [
        { id: 'a', username: 'a' },
        { id: 'b', username: 'b' },
      ],
      results: [
        { userId: 'a', place: 1, extraStats: [] },
        { userId: 'b', place: 2, extraStats: [] },
      ],
    } as never);
    expect(wallet.balance('a')).toBe(10 + WIN_BONUS_COINS);
    expect(wallet.balance('b')).toBe(5);
  });

  it('comprar descuenta monedas; sin saldo o repetido falla', () => {
    const wallet = new FakeWallet();
    const buy = new BuyItem(wallet);
    const crown = SHOP_ITEMS.find((i) => i.id === 'hat:crown')!;
    expect(() => buy.execute('u', 'hat:crown')).toThrow('monedas');
    wallet.credit('u', 300);
    expect(buy.execute('u', 'hat:crown').coins).toBe(300 - crown.price);
    expect(() => buy.execute('u', 'hat:crown')).toThrow('Ya tienes');
    expect(() => buy.execute('u', 'hat:nope')).toThrow('desconocido');
  });

  it('el personaje solo puede llevar objetos de pago comprados', () => {
    const wallet = new FakeWallet();
    const avatars = new FakeAvatars();
    const update = new UpdateAvatar(avatars, { findByUserId: () => undefined } as never, { room: () => {} } as never, wallet);
    const wearing = { ...base, hat: 'crown' };
    expect(() => update.execute('u', wearing)).toThrow('tienda');
    wallet.items.set('u', new Set(['hat:crown']));
    expect(update.execute('u', wearing)).toMatchObject({ hat: 'crown' });
    expect(update.execute('u', { ...base, hat: 'cap' })).toMatchObject({ hat: 'cap' });
  });

  it('la experiencia sube con cada partida y define el nivel', async () => {
    const wallet = new FakeWallet();
    await new RecordGameStats(noStats, wallet).handle({
      game: 'roulette',
      players: [{ id: 'a', username: 'a' }, { id: 'b', username: 'b' }],
      results: [{ userId: 'a', place: 1, extraStats: [] }, { userId: 'b', place: 2, extraStats: [] }],
    } as never);
    expect(wallet.xp('a')).toBe(xpForResult(1, 2, 10));
    expect(wallet.xp('a')).toBeGreaterThan(wallet.xp('b'));
    expect(levelOf(250)).toBe(2);
  });

  it('el pase cuesta 100 monedas y sus 10 objetos se desbloquean por nivel', () => {
    expect(PASS_TIERS).toHaveLength(10);
    const wallet = new FakeWallet();
    const buyPass = new BuyBattlePass(wallet);
    expect(() => buyPass.execute('u')).toThrow('monedas');
    wallet.credit('u', 150);
    wallet.addXp('u', 250); // nivel 2
    const view = buyPass.execute('u');
    expect(view.coins).toBe(150 - PASS_PRICE);
    expect(view.pass.tiers.filter((t) => t.unlocked).map((t) => t.tier)).toEqual([1, 2]);
    expect(view.owned).toEqual(expect.arrayContaining(['pet:panda', 'hat:pirate']));
    expect(view.owned).not.toContain('glasses:visor');
    expect(() => buyPass.execute('u')).toThrow('Ya tienes');
  });

  it('sin el pase los objetos exclusivos no se pueden llevar aunque el nivel alcance', () => {
    const wallet = new FakeWallet();
    wallet.addXp('u', 5000);
    const update = new UpdateAvatar(new FakeAvatars(), { findByUserId: () => undefined } as never, { room: () => {} } as never, wallet);
    expect(() => update.execute('u', { ...base, hat: 'pirate' })).toThrow('tienda');
    wallet.credit('u', 100);
    new BuyBattlePass(wallet).execute('u');
    expect(update.execute('u', { ...base, hat: 'pirate' })).toMatchObject({ hat: 'pirate' });
    expect(shopView(wallet, 'u').level).toBe(50);
  });
});
