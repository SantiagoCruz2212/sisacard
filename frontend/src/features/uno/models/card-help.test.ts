import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '@/shared/config/i18n';
import { cardHelp, guideSections } from '@/features/uno/models/card-help';
import type { UnoSettings } from '@/shared/models/realtime';

const base: UnoSettings = { infinity: false, flip: false, stacking: false, challenge: false, sevenZero: false, jumpIn: false, catchUno: false };
const t = i18n.t.bind(i18n);

describe('ayuda de las cartas', () => {
  beforeAll(() => i18n.changeLanguage('es'));

  it('explica cada carta y no deja claves sin traducir', () => {
    for (const value of ['skip', 'joker', 'plusAll', 'dice12', 'wildDrawColor', 'flip', 'number'] as const) {
      const text = cardHelp({ value }, base, t);
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/uno\.help/);
    }
    expect(cardHelp({ value: 'plusAll' }, base, t)).toMatch(/roban 4/);
  });

  it('el 7 y el 0 solo hablan de cambiar manos con la regla 7-0', () => {
    expect(cardHelp({ value: '7' }, base, t)).not.toMatch(/7-0/);
    expect(cardHelp({ value: '7' }, { ...base, sevenZero: true }, t)).toMatch(/cambias tu mano/);
    expect(cardHelp({ value: '0' }, { ...base, sevenZero: true }, t)).toMatch(/todas las manos/);
  });

  it('suma las reglas de apilar y desafiar cuando aplican', () => {
    expect(cardHelp({ value: 'draw2' }, { ...base, stacking: true }, t)).toMatch(/Apilar/);
    expect(cardHelp({ value: 'skip' }, { ...base, stacking: true }, t)).not.toMatch(/Apilar/);
    expect(cardHelp({ value: 'wild4' }, { ...base, challenge: true }, t)).toMatch(/desafiar/);
  });
});

describe('guía de cartas', () => {
  const titles = (s: UnoSettings) => guideSections(s, t).map((g) => g.title);

  it('muestra solo las secciones de la baraja elegida', () => {
    expect(titles(base)).toEqual(['Baraja']);
    expect(titles({ ...base, infinity: true })).toEqual(['Baraja', '♾️ Cartas Infinity']);
    expect(titles({ ...base, flip: true })).toEqual(['☀️ Lado claro', '🌑 Lado oscuro']);
    expect(titles({ ...base, flip: true, infinity: true })).toEqual([
      '☀️ Lado claro',
      '🌑 Lado oscuro',
      '♾️ Cartas Infinity (en los dos lados)',
    ]);
  });

  it('las cartas del lado oscuro se dibujan oscuras y el 7 aparece con la regla 7-0', () => {
    const [, dark] = guideSections({ ...base, flip: true }, t);
    expect(dark!.entries.every((e) => e.dark)).toBe(true);
    const classic = guideSections({ ...base, sevenZero: true }, t)[0]!;
    expect(classic.entries.map((e) => e.face.value)).toContain('7');
  });
});
