import type { TFunction } from 'i18next';
import type { UnoCardFace, UnoSettings, UnoValue } from '@/shared/models/realtime';

const DICE: UnoValue[] = ['dice4', 'dice6', 'dice8', 'dice12', 'dice20'];
const STACKABLE: UnoValue[] = ['draw1', 'draw2', 'wildDraw2', 'draw4', 'wild4', 'draw5'];
const CHALLENGEABLE: UnoValue[] = ['wild4', 'wildDraw2'];

/** Qué hace una carta, según las reglas de la sala (p. ej. el 7 solo cambia manos con 7-0). */
export function cardHelp(face: Pick<UnoCardFace, 'value'>, settings: UnoSettings | undefined, t: TFunction): string {
  const { value } = face;
  const parts: string[] = [];
  if (/^\d$/.test(value)) {
    parts.push(t('uno.help.digit'));
    if (settings?.sevenZero && value === '7') parts.push(t('uno.help.seven'));
    if (settings?.sevenZero && value === '0') parts.push(t('uno.help.zero'));
  } else if (DICE.includes(value)) {
    parts.push(t('uno.help.dice'));
  } else {
    parts.push(t(`uno.help.${value as 'skip'}`));
  }
  if (settings?.stacking && STACKABLE.includes(value)) parts.push(t('uno.help.stack'));
  if (settings?.challenge && CHALLENGEABLE.includes(value)) parts.push(t('uno.help.challenge'));
  return parts.join(' ');
}

export interface GuideEntry {
  face: UnoCardFace;
  /** Nombre a mostrar cuando la entrada agrupa varias cartas (números, dados). */
  name?: string;
  dark?: boolean;
}

export interface GuideSection {
  title: string;
  entries: GuideEntry[];
}

const entry = (color: UnoCardFace['color'], value: UnoValue, extra: Partial<GuideEntry> = {}): GuideEntry => ({
  face: { color, value },
  ...extra,
});

/** Las cartas que trae la baraja de la sala, agrupadas para la guía. */
export function guideSections(settings: UnoSettings, t: TFunction): GuideSection[] {
  const digits = (color: UnoCardFace['color'], range: string, dark = false) =>
    entry(color, '5', { name: t('uno.guide.digits', { range }), dark });
  const sevenZero = settings.sevenZero ? [entry('green', '7'), entry('yellow', '0')] : [];
  const infinity: GuideEntry[] = [
    entry('green', 'number'),
    entry('blue', 'draw4'),
    entry('red', 'minus1'),
    entry('yellow', 'replay'),
    entry('wild', 'number'),
    entry('wild', 'double'),
    entry('wild', 'half'),
    entry('wild', 'plusAll'),
    entry('wild', 'target4'),
    entry('wild', 'replay'),
    entry('wild', 'dice20', { name: t('uno.guide.dice') }),
    entry('wild', 'eye'),
    entry('wild', 'swap'),
    entry('wild', 'joker'),
    entry('wild', 'rotate'),
  ];

  if (!settings.flip) {
    const base = [
      digits('red', '0–9'),
      ...sevenZero,
      entry('blue', 'skip'),
      entry('green', 'reverse'),
      entry('yellow', 'draw2'),
      entry('wild', 'wild'),
      entry('wild', 'wild4'),
    ];
    return [
      { title: t('uno.guide.deck'), entries: base },
      ...(settings.infinity ? [{ title: t('uno.guide.infinity'), entries: infinity }] : []),
    ];
  }

  const light = [
    digits('red', '1–9'),
    ...(settings.sevenZero ? [entry('green', '7')] : []),
    entry('blue', 'draw1'),
    entry('green', 'reverse'),
    entry('yellow', 'skip'),
    entry('red', 'flip'),
    entry('wild', 'wild'),
    entry('wild', 'wildDraw2'),
  ];
  const dark = [
    digits('pink', '1–9', true),
    entry('teal', 'draw5', { dark: true }),
    entry('orange', 'reverse', { dark: true }),
    entry('purple', 'skipAll', { dark: true }),
    entry('pink', 'flip', { dark: true }),
    entry('wild', 'wild', { dark: true }),
    entry('wild', 'wildDrawColor', { dark: true }),
  ];
  return [
    { title: t('uno.guide.light'), entries: light },
    { title: t('uno.guide.dark'), entries: dark },
    ...(settings.infinity ? [{ title: t('uno.guide.infinityBoth'), entries: infinity }] : []),
  ];
}
