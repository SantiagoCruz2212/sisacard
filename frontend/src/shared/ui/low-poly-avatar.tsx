import type { ReactNode } from 'react';
import { PALETTE, type Avatar } from '@/shared/models/avatar';

/** Aclara (amount > 0) u oscurece (amount < 0) un color #rrggbb; es lo que da el aspecto de facetas. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const mix = (c: number) => Math.round(c + (target - c) * Math.abs(amount));
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

const Poly = ({ p, fill, opacity }: { p: string; fill: string; opacity?: number }) => (
  <polygon points={p} fill={fill} fillOpacity={opacity} />
);

interface Colors {
  skin: string;
  hair: string;
  eye: string;
  cloth: string;
}

function HairBack({ style, c }: { style: Avatar['hair']; c: Colors }) {
  const dark = shade(c.hair, -0.2);
  if (style === 'long') return <Poly p="14,50 18,22 34,6 66,6 82,22 86,50 88,92 70,96 30,96 12,92" fill={dark} />;
  if (style === 'bob') return <Poly p="16,48 20,20 36,6 64,6 80,20 84,48 82,74 66,72 34,72 18,74" fill={dark} />;
  return null;
}

function HairFront({ style, c }: { style: Avatar['hair']; c: Colors }) {
  const dark = shade(c.hair, -0.18);
  const light = shade(c.hair, 0.14);
  if (style === 'bald') return <Poly p="44,18 56,18 52,24 48,24" fill="#fff" opacity={0.14} />;

  const cap: ReactNode = (
    <>
      <Poly p="20,46 20,26 32,10 50,6 68,10 80,26 80,46 72,34 62,28 38,28 28,34" fill={c.hair} />
      <Poly p="20,46 20,26 28,34" fill={dark} />
      <Poly p="32,10 50,6 68,10 62,28 38,28" fill={light} />
      <Poly p="80,46 80,26 72,34" fill={dark} />
      <Poly p="50,6 68,10 80,26 72,34 62,28" fill={dark} opacity={0.5} />
    </>
  );

  return (
    <>
      {cap}
      {style === 'long' && (
        <>
          <Poly p="20,46 28,34 30,62 22,78" fill={c.hair} />
          <Poly p="80,46 72,34 70,62 78,78" fill={dark} />
        </>
      )}
      {style === 'bob' && (
        <>
          <Poly p="20,46 28,34 30,60 22,70" fill={c.hair} />
          <Poly p="80,46 72,34 70,60 78,70" fill={dark} />
        </>
      )}
      {style === 'spiky' && (
        <>
          <Poly p="22,26 26,2 38,22" fill={light} />
          <Poly p="36,20 50,-6 64,20" fill={c.hair} />
          <Poly p="62,22 74,2 78,26" fill={dark} />
        </>
      )}
      {style === 'bun' && (
        <>
          <Poly p="42,10 38,0 44,-8 56,-8 62,0 58,10" fill={light} />
          <Poly p="50,-8 62,0 58,10 50,6" fill={dark} />
        </>
      )}
    </>
  );
}

function Clothes({ style, c }: { style: Avatar['clothes']; c: Colors }) {
  const cloth = c.cloth;
  const neckline = shade(c.skin, -0.2);
  const torso = (base: string) => (
    <>
      <Poly p="12,120 16,90 36,80 50,98 44,120" fill={shade(base, -0.12)} />
      <Poly p="88,120 84,90 64,80 50,98 56,120" fill={shade(base, 0.06)} />
      <Poly p="44,120 50,98 56,120" fill={shade(base, -0.05)} />
    </>
  );

  if (style === 'vest') {
    return (
      <>
        {torso('#e9e4d8')}
        <Poly p="40,82 60,82 50,96" fill={neckline} />
        <Poly p="18,92 36,82 46,120 14,120" fill={shade(cloth, -0.1)} />
        <Poly p="82,92 64,82 54,120 86,120" fill={shade(cloth, 0.08)} />
        <Poly p="36,80 46,88 40,96 34,88" fill="#fff" />
        <Poly p="64,80 54,88 60,96 66,88" fill="#fff" />
      </>
    );
  }
  if (style === 'suit') {
    return (
      <>
        {torso(cloth)}
        <Poly p="42,82 58,82 50,114" fill="#f4f4f4" />
        <Poly p="36,80 46,86 42,104 28,96" fill={shade(cloth, -0.25)} />
        <Poly p="64,80 54,86 58,104 72,96" fill={shade(cloth, -0.1)} />
        <Poly p="47,86 53,86 54,108 50,114 46,108" fill="#c0392b" />
      </>
    );
  }
  return (
    <>
      {torso(cloth)}
      <Poly p="38,82 62,82 50,96" fill={neckline} />
      {style === 'hoodie' && (
        <>
          <Poly p="34,80 44,82 50,98 40,100" fill={shade(cloth, -0.28)} />
          <Poly p="66,80 56,82 50,98 60,100" fill={shade(cloth, -0.18)} />
          <polyline points="46,96 45,112" stroke="#fff" strokeWidth="1.4" fill="none" />
          <polyline points="54,96 55,112" stroke="#fff" strokeWidth="1.4" fill="none" />
        </>
      )}
    </>
  );
}

function Eye({ cx, side, style, c }: { cx: number; side: 'l' | 'r'; style: Avatar['eyes']; c: Colors }) {
  const lid = shade(c.skin, -0.14);
  const browColor = shade(c.hair, -0.25);
  const browY = style === 'happy' ? -1.6 : style === 'sleepy' ? 1.2 : 0;
  const brow =
    style === 'angry'
      ? side === 'l'
        ? `${cx - 8},36.5 ${cx + 8},40.5 ${cx + 8},42.5 ${cx - 8},38.5`
        : `${cx - 8},40.5 ${cx + 8},36.5 ${cx + 8},38.5 ${cx - 8},42.5`
      : `${cx - 8},${38.5 + browY} ${cx + 8},${38.5 + browY} ${cx + 8},${40.5 + browY} ${cx - 8},${40.5 + browY}`;

  return (
    <>
      <Poly p={brow} fill={browColor} />
      {style === 'happy' ? (
        <polyline points={`${cx - 6},46.5 ${cx},41.5 ${cx + 6},46.5`} stroke="#2a1a14" strokeWidth="2.4" fill="none" strokeLinejoin="miter" />
      ) : (
        <>
          <Poly p={`${cx - 7},45 ${cx - 3},42 ${cx + 3},42 ${cx + 7},45 ${cx + 3},48 ${cx - 3},48`} fill="#fff" />
          <Poly p={`${cx - 3},45 ${cx},42.4 ${cx + 3},45 ${cx},47.6`} fill={c.eye} />
          <Poly p={`${cx - 1.3},45 ${cx},43.7 ${cx + 1.3},45 ${cx},46.3`} fill="#111" />
          {style === 'sleepy' && <Poly p={`${cx - 7.5},45.6 ${cx - 7},44.5 ${cx - 3},41.5 ${cx + 3},41.5 ${cx + 7},44.5 ${cx + 7.5},45.6`} fill={lid} />}
          {style === 'angry' && (
            <Poly
              p={
                side === 'l'
                  ? `${cx - 7.5},42.5 ${cx + 7.5},46.2 ${cx + 7.5},41 ${cx - 7.5},41`
                  : `${cx - 7.5},46.2 ${cx + 7.5},42.5 ${cx + 7.5},41 ${cx - 7.5},41`
              }
              fill={lid}
            />
          )}
        </>
      )}
    </>
  );
}

function Mouth({ style }: { style: Avatar['mouth'] }) {
  const dark = '#7a2e2e';
  switch (style) {
    case 'smile':
      return <Poly p="41,63 50,69 59,63 50,66" fill={dark} />;
    case 'grin':
      return (
        <>
          <Poly p="40,63 60,63 56,70 44,70" fill="#fff" />
          <polyline points="40,63 60,63 56,70 44,70 40,63" fill="none" stroke={dark} strokeWidth="1.2" />
          <polyline points="50,63 50,70" stroke={dark} strokeWidth="0.8" />
        </>
      );
    case 'open':
      return (
        <>
          <Poly p="44,63 56,63 54,72 46,72" fill={dark} />
          <Poly p="46,69 54,69 54,72 46,72" fill="#d96c6c" />
        </>
      );
    case 'frown':
      return <Poly p="41,69 50,64 59,69 50,66.5" fill={dark} />;
    default:
      return <Poly p="43,65 57,65 57,67 43,67" fill={dark} />;
  }
}

interface LowPolyAvatarProps {
  avatar: Avatar;
  /** Ancho en px; el alto se calcula. */
  size?: number;
  className?: string;
  label?: string;
}

/** Personaje de polígonos planos (estilo low-poly), de busto, pensado para verse sentado a la mesa. */
export function LowPolyAvatar({ avatar, size = 96, className = '', label }: LowPolyAvatarProps) {
  const c: Colors = {
    skin: PALETTE.skin[avatar.skin] ?? PALETTE.skin[0],
    hair: PALETTE.hairColor[avatar.hairColor] ?? PALETTE.hairColor[0],
    eye: PALETTE.eyeColor[avatar.eyeColor] ?? PALETTE.eyeColor[0],
    cloth: PALETTE.clothesColor[avatar.clothesColor] ?? PALETTE.clothesColor[0],
  };
  const skinDark = shade(c.skin, -0.18);

  return (
    <svg
      viewBox="0 -10 100 130"
      width={size}
      height={(size * 130) / 100}
      className={className}
      role="img"
      aria-label={label ?? 'personaje'}
    >
      <HairBack style={avatar.hair} c={c} />
      {avatar.clothes === 'hoodie' && <Poly p="28,72 72,72 80,96 20,96" fill={shade(c.cloth, -0.3)} />}
      <Clothes style={avatar.clothes} c={c} />
      <Poly p="40,70 60,70 62,86 50,94 38,86" fill={skinDark} />
      {/* orejas */}
      <Poly p="22,44 16,48 18,57 24,57" fill={shade(c.skin, -0.1)} />
      <Poly p="78,44 84,48 82,57 76,57" fill={shade(c.skin, -0.14)} />
      {/* cabeza facetada */}
      <Poly p="50,14 70,22 78,42 74,62 62,74 50,78 38,74 26,62 22,42 30,22" fill={c.skin} />
      <Poly p="22,42 30,22 38,26 36,50 38,74 26,62" fill="#000" opacity={0.1} />
      <Poly p="78,42 70,22 62,26 64,50 62,74 74,62" fill="#fff" opacity={0.08} />
      <Poly p="26,62 38,74 50,78 62,74 74,62 66,58 34,58" fill="#000" opacity={0.06} />
      <Poly p="30,22 50,14 70,22 64,32 36,32" fill="#fff" opacity={0.06} />
      <Poly p="47,50 53,50 50,58" fill="#000" opacity={0.15} />
      <Eye cx={38} side="l" style={avatar.eyes} c={c} />
      <Eye cx={62} side="r" style={avatar.eyes} c={c} />
      <Mouth style={avatar.mouth} />
      <HairFront style={avatar.hair} c={c} />
      {/* manos apoyadas en la mesa */}
      <Poly p="22,108 34,104 38,118 24,120" fill={c.skin} />
      <Poly p="78,108 66,104 62,118 76,120" fill={shade(c.skin, -0.06)} />
    </svg>
  );
}
