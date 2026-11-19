import { HAT_PALETTE, PALETTE, type Avatar, type HumanAvatar } from '@/shared/models/avatar';

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

/** Octágono: la "circunferencia" del estilo low-poly. */
function octagon(cx: number, cy: number, r: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

interface Colors {
  skin: string;
  hair: string;
  eye: string;
  cloth: string;
  hat: string;
}

// ---------------------------------------------------------------- pelo
function HairBack({ style, c }: { style: HumanAvatar['hair']; c: Colors }) {
  const dark = shade(c.hair, -0.2);
  switch (style) {
    case 'long':
      return <Poly p="14,50 18,22 34,6 66,6 82,22 86,50 88,92 70,96 30,96 12,92" fill={dark} />;
    case 'bob':
      return <Poly p="16,48 20,20 36,6 64,6 80,20 84,48 82,74 66,72 34,72 18,74" fill={dark} />;
    case 'ponytail':
      return (
        <>
          <Poly p="70,24 86,30 94,58 86,90 78,62 74,36" fill={dark} />
          <Poly p="72,26 82,28 82,35 72,33" fill="#d4a020" />
        </>
      );
    case 'afro':
      return (
        <>
          <Poly p="8,42 12,16 28,-2 50,-10 72,-2 88,16 92,42 86,60 74,50 26,50 14,60" fill={dark} />
          <Poly p="12,16 28,-2 40,6 26,22" fill={shade(c.hair, 0.1)} />
        </>
      );
    case 'pigtails':
      return (
        <>
          <Poly p="24,36 8,40 5,66 16,82 20,58 26,44" fill={dark} />
          <Poly p="76,36 92,40 95,66 84,82 80,58 74,44" fill={dark} />
          <Poly p="22,34 28,38 24,46 18,42" fill="#e05a9c" />
          <Poly p="78,34 72,38 76,46 82,42" fill="#e05a9c" />
        </>
      );
    default:
      return null;
  }
}

function HairFront({ style, c }: { style: HumanAvatar['hair']; c: Colors }) {
  const dark = shade(c.hair, -0.18);
  const light = shade(c.hair, 0.14);
  if (style === 'bald') return <Poly p="44,18 56,18 52,24 48,24" fill="#fff" opacity={0.14} />;

  const cap = (
    <>
      <Poly p="20,46 20,26 32,10 50,6 68,10 80,26 80,46 72,34 62,28 38,28 28,34" fill={c.hair} />
      <Poly p="20,46 20,26 28,34" fill={dark} />
      <Poly p="32,10 50,6 68,10 62,28 38,28" fill={light} />
      <Poly p="80,46 80,26 72,34" fill={dark} />
      <Poly p="50,6 68,10 80,26 72,34 62,28" fill={dark} opacity={0.5} />
    </>
  );

  switch (style) {
    case 'long':
      return (
        <>
          {cap}
          <Poly p="20,46 28,34 30,62 22,78" fill={c.hair} />
          <Poly p="80,46 72,34 70,62 78,78" fill={dark} />
        </>
      );
    case 'bob':
      return (
        <>
          {cap}
          <Poly p="20,46 28,34 30,60 22,70" fill={c.hair} />
          <Poly p="80,46 72,34 70,60 78,70" fill={dark} />
        </>
      );
    case 'spiky':
      return (
        <>
          {cap}
          <Poly p="22,26 26,2 38,22" fill={light} />
          <Poly p="36,20 50,-6 64,20" fill={c.hair} />
          <Poly p="62,22 74,2 78,26" fill={dark} />
        </>
      );
    case 'bun':
      return (
        <>
          {cap}
          <Poly p="42,10 38,0 44,-8 56,-8 62,0 58,10" fill={light} />
          <Poly p="50,-8 62,0 58,10 50,6" fill={dark} />
        </>
      );
    case 'mohawk':
      return (
        <>
          <Poly p="30,30 50,20 70,30 50,26" fill={dark} opacity={0.6} />
          <Poly p="41,26 40,10 46,-4 50,-12 54,-4 60,10 59,26" fill={light} />
          <Poly p="50,-12 54,-4 60,10 59,26 50,22" fill={c.hair} />
        </>
      );
    case 'curly':
      return (
        <>
          {cap}
          {[
            [26, 24],
            [36, 12],
            [50, 7],
            [64, 12],
            [74, 24],
            [22, 38],
            [78, 38],
          ].map(([x, y], i) => (
            <Poly key={i} p={octagon(x as number, y as number, 8)} fill={i % 2 ? c.hair : light} />
          ))}
        </>
      );
    case 'buzz':
      return <Poly p="24,40 26,28 36,18 50,15 64,18 74,28 76,40 70,32 30,32" fill={dark} opacity={0.85} />;
    case 'afro':
      return <Poly p="24,42 28,26 40,20 60,20 72,26 76,42 70,32 30,32" fill={c.hair} />;
    case 'sidepart':
      return (
        <>
          <Poly p="20,46 20,26 32,10 50,6 68,10 80,26 80,40 64,26 44,22 32,34 26,46" fill={c.hair} />
          <Poly p="20,46 28,30 52,24 58,34 40,36 30,50" fill={light} />
          <Poly p="52,24 68,10 80,26 64,26" fill={dark} opacity={0.5} />
        </>
      );
    default:
      return cap; // short, ponytail y pigtails comparten el flequillo
  }
}

// ---------------------------------------------------------------- sombreros
function Hat({ style, c }: { style: HumanAvatar['hat']; c: Colors }) {
  const dark = shade(c.hat, -0.25);
  const light = shade(c.hat, 0.15);
  switch (style) {
    case 'cap':
      return (
        <>
          <Poly p="22,30 28,14 50,6 72,14 78,30 70,25 30,25" fill={c.hat} />
          <Poly p="28,14 50,6 56,22 34,24" fill={light} />
          <Poly p="70,25 98,30 72,36" fill={dark} />
          <Poly p={octagon(50, 6, 2.6)} fill={dark} />
        </>
      );
    case 'beanie':
      return (
        <>
          <Poly p="22,34 24,18 36,6 50,2 64,6 76,18 78,34 66,29 34,29" fill={c.hat} />
          <Poly p="22,34 24,18 36,6 38,28" fill={light} opacity={0.6} />
          <Poly p="21,34 79,34 77,26 23,26" fill={dark} />
          <Poly p={octagon(50, -2, 6)} fill={light} />
        </>
      );
    case 'tophat':
      return (
        <>
          <Poly p="14,26 86,26 80,34 20,34" fill={shade(c.hat, -0.35)} />
          <Poly p="30,26 32,-16 68,-16 70,26" fill={c.hat} />
          <Poly p="32,-16 50,-18 68,-16 66,-8 34,-8" fill={light} opacity={0.5} />
          <Poly p="30,14 70,14 70,21 30,21" fill="#c0392b" />
        </>
      );
    case 'crown':
      return (
        <>
          <Poly p="24,28 26,4 38,16 50,0 62,16 74,4 76,28" fill="#f2c230" />
          <Poly p="50,0 62,16 74,4 76,28 50,28" fill="#d49a10" opacity={0.6} />
          <Poly p={octagon(50, 18, 3)} fill={c.hat} />
          <Poly p={octagon(34, 22, 2)} fill="#c0392b" />
          <Poly p={octagon(66, 22, 2)} fill="#2d5fa8" />
        </>
      );
    case 'wizard':
      return (
        <>
          <Poly p="10,32 90,32 82,40 18,40" fill={dark} />
          <Poly p="26,32 40,0 50,-36 62,-4 74,32" fill={c.hat} />
          <Poly p="50,-36 62,-4 74,32 50,32" fill={dark} opacity={0.5} />
          <Poly p="27,26 73,26 74,32 26,32" fill={light} />
          <Poly p="46,4 50,-4 54,4 62,6 56,11 58,19 50,15 42,19 44,11 38,6" fill="#facc15" />
        </>
      );
    case 'pirate':
      return (
        <>
          <Poly p="8,32 50,0 92,32 70,38 30,38" fill="#1f2937" />
          <Poly p="8,32 50,0 92,32 88,32 50,5 12,32" fill="#d4a020" />
          <Poly p="30,38 70,38 60,30 40,30" fill="#111827" />
          <Poly p={octagon(50, 20, 4.2)} fill="#f3f4f6" />
          <Poly p="46,22 48,22 48,25 46,25" fill="#111" />
          <Poly p="52,22 54,22 54,25 52,25" fill="#111" />
        </>
      );
    case 'viking':
      return (
        <>
          <Poly p="24,22 8,18 2,-8 14,6 27,12" fill="#f5e6c8" />
          <Poly p="76,22 92,18 98,-8 86,6 73,12" fill="#f5e6c8" />
          <Poly p="22,34 24,14 38,2 62,2 76,14 78,34 66,28 34,28" fill="#9aa3ad" />
          <Poly p="38,2 62,2 56,14 44,14" fill="#fff" opacity={0.2} />
          <Poly p="21,28 79,28 79,35 21,35" fill="#6b7280" />
          <Poly p="47,28 53,28 53,46 47,46" fill="#7d8791" />
        </>
      );
    case 'headband':
      return (
        <>
          <Poly p="21,32 79,32 79,38 21,38" fill={c.hat} />
          <Poly p="21,32 50,30 79,32 79,34 21,34" fill={light} opacity={0.6} />
        </>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------- cara
function Glasses({ style }: { style: HumanAvatar['glasses'] }) {
  const frame = '#1c1c22';
  const stroke = { stroke: frame, strokeWidth: 1.8, fill: 'none', strokeLinejoin: 'miter' as const };
  switch (style) {
    case 'round':
      return (
        <>
          <polygon points={octagon(38, 45, 8.5)} {...stroke} />
          <polygon points={octagon(62, 45, 8.5)} {...stroke} />
          <polyline points="46.5,44 53.5,44" {...stroke} />
          <polyline points="29.5,44 22,43" {...stroke} />
          <polyline points="70.5,44 78,43" {...stroke} />
        </>
      );
    case 'square':
      return (
        <>
          <polygon points="28.5,39 47.5,39 47.5,51 28.5,51" {...stroke} />
          <polygon points="52.5,39 71.5,39 71.5,51 52.5,51" {...stroke} />
          <polyline points="47.5,42 52.5,42" {...stroke} />
          <polyline points="28.5,42 22,41" {...stroke} />
          <polyline points="71.5,42 78,41" {...stroke} />
        </>
      );
    case 'sunglasses':
      return (
        <>
          <Poly p="27,39 48,39 45,52 30,52" fill="#111" />
          <Poly p="52,39 73,39 70,52 55,52" fill="#111" />
          <polyline points="48,41 52,41" {...stroke} />
          <Poly p="31,41 38,41 34,47 31,47" fill="#fff" opacity={0.25} />
          <Poly p="56,41 63,41 59,47 56,47" fill="#fff" opacity={0.25} />
        </>
      );
    case 'visor':
      return (
        <>
          <Poly p="24,38 76,38 72,52 28,52" fill="#22d3ee" opacity={0.55} />
          <polygon points="24,38 76,38 72,52 28,52" stroke="#0e7490" strokeWidth="1.6" fill="none" />
          <Poly p="30,40 44,40 38,50 30,50" fill="#fff" opacity={0.3} />
          <polyline points="24,40 19,43" stroke="#0e7490" strokeWidth="1.6" fill="none" />
          <polyline points="76,40 81,43" stroke="#0e7490" strokeWidth="1.6" fill="none" />
        </>
      );
    case 'monocle':
      return (
        <>
          <polygon points={octagon(62, 45, 8.5)} stroke="#d4a020" strokeWidth={1.8} fill="#fff" fillOpacity={0.12} />
          <polyline points="62,53.5 66,70 70,86" stroke="#d4a020" strokeWidth={1} fill="none" />
        </>
      );
    default:
      return null;
  }
}

function Beard({ style, c }: { style: HumanAvatar['beard']; c: Colors }) {
  const hair = shade(c.hair, -0.12);
  switch (style) {
    case 'stubble':
      return <Poly p="30,58 38,70 50,75 62,70 70,58 62,64 38,64" fill={c.hair} opacity={0.4} />;
    case 'mustache':
      return <Poly p="37,60 50,58 63,60 58,65 50,62 42,65" fill={hair} />;
    case 'goatee':
      return (
        <>
          <Poly p="37,60 50,58 63,60 58,65 50,62 42,65" fill={hair} />
          <Poly p="44,66 56,66 54,77 50,80 46,77" fill={hair} />
        </>
      );
    case 'beard':
      return (
        <>
          <Poly p="27,54 33,72 50,84 67,72 73,54 64,62 50,66 36,62" fill={hair} />
          <Poly p="27,54 33,72 40,70 36,62" fill={shade(c.hair, -0.3)} opacity={0.6} />
          <Poly p="37,60 50,58 63,60 58,65 50,62 42,65" fill={shade(c.hair, -0.2)} />
        </>
      );
    default:
      return null;
  }
}

function Eye({ cx, side, style, c, female }: { cx: number; side: 'l' | 'r'; style: HumanAvatar['eyes']; c: Colors; female: boolean }) {
  const lid = shade(c.skin, -0.14);
  const browColor = shade(c.hair, -0.25);
  // El guiño cierra el ojo izquierdo y deja el derecho normal.
  const look = style === 'wink' ? (side === 'l' ? 'happy' : 'normal') : style;
  const browY = look === 'happy' ? -1.6 : look === 'sleepy' ? 1.2 : look === 'surprised' ? -3 : 0;
  const brow =
    look === 'angry'
      ? side === 'l'
        ? `${cx - 8},36.5 ${cx + 8},40.5 ${cx + 8},42.5 ${cx - 8},38.5`
        : `${cx - 8},40.5 ${cx + 8},36.5 ${cx + 8},38.5 ${cx - 8},42.5`
      : `${cx - 8},${38.5 + browY} ${cx + 8},${38.5 + browY} ${cx + 8},${40.5 + browY} ${cx - 8},${40.5 + browY}`;
  const browFinal = female ? brow : brow; // (misma forma; las cejas femeninas se ven más finas por el color)

  return (
    <>
      <Poly p={browFinal} fill={browColor} />
      {look === 'happy' ? (
        <polyline points={`${cx - 6},46.5 ${cx},41.5 ${cx + 6},46.5`} stroke="#2a1a14" strokeWidth="2.4" fill="none" strokeLinejoin="miter" />
      ) : look === 'surprised' ? (
        <>
          <Poly p={octagon(cx, 45, 7)} fill="#fff" />
          <Poly p={octagon(cx, 45, 2.6)} fill={c.eye} />
          <Poly p={octagon(cx, 45, 1.1)} fill="#111" />
        </>
      ) : (
        <>
          <Poly p={`${cx - 7},45 ${cx - 3},42 ${cx + 3},42 ${cx + 7},45 ${cx + 3},48 ${cx - 3},48`} fill="#fff" />
          <Poly p={`${cx - 3},45 ${cx},42.4 ${cx + 3},45 ${cx},47.6`} fill={c.eye} />
          <Poly p={`${cx - 1.3},45 ${cx},43.7 ${cx + 1.3},45 ${cx},46.3`} fill="#111" />
          {look === 'sleepy' && <Poly p={`${cx - 7.5},45.6 ${cx - 7},44.5 ${cx - 3},41.5 ${cx + 3},41.5 ${cx + 7},44.5 ${cx + 7.5},45.6`} fill={lid} />}
          {look === 'angry' && (
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
      {female && look !== 'happy' && (
        <>
          <polyline points={`${cx - 7.5},44.6 ${cx - 3},41.4 ${cx + 3},41.4 ${cx + 7.5},44.6`} stroke="#15151a" strokeWidth="1.3" fill="none" />
          <polyline points={side === 'l' ? `${cx - 7.5},44.6 ${cx - 10.5},41.8` : `${cx + 7.5},44.6 ${cx + 10.5},41.8`} stroke="#15151a" strokeWidth="1.3" fill="none" />
        </>
      )}
    </>
  );
}

function Mouth({ style, lip }: { style: HumanAvatar['mouth']; lip: string }) {
  switch (style) {
    case 'smile':
      return <Poly p="41,63 50,69 59,63 50,66" fill={lip} />;
    case 'grin':
      return (
        <>
          <Poly p="40,63 60,63 56,70 44,70" fill="#fff" />
          <polyline points="40,63 60,63 56,70 44,70 40,63" fill="none" stroke={lip} strokeWidth="1.2" />
          <polyline points="50,63 50,70" stroke={lip} strokeWidth="0.8" />
        </>
      );
    case 'open':
      return (
        <>
          <Poly p="44,63 56,63 54,72 46,72" fill={lip} />
          <Poly p="46,69 54,69 54,72 46,72" fill="#d96c6c" />
        </>
      );
    case 'frown':
      return <Poly p="41,69 50,64 59,69 50,66.5" fill={lip} />;
    case 'smirk':
      return <Poly p="42,66 50,67 61,62 59,66.5 50,69.5" fill={lip} />;
    case 'tongue':
      return (
        <>
          <Poly p="41,63 59,63 55,69 45,69" fill={lip} />
          <Poly p="46,68 54,68 53,77 47,77" fill="#e0707a" />
          <polyline points="50,68 50,74" stroke="#a34a52" strokeWidth="0.8" />
        </>
      );
    default:
      return <Poly p="43,65 57,65 57,67 43,67" fill={lip} />;
  }
}

// ---------------------------------------------------------------- ropa
function Clothes({ style, c }: { style: HumanAvatar['clothes']; c: Colors }) {
  const cloth = c.cloth;
  const neckline = shade(c.skin, -0.2);
  const torso = (base: string) => (
    <>
      <Poly p="12,120 16,90 36,80 50,98 44,120" fill={shade(base, -0.12)} />
      <Poly p="88,120 84,90 64,80 50,98 56,120" fill={shade(base, 0.06)} />
      <Poly p="44,120 50,98 56,120" fill={shade(base, -0.05)} />
    </>
  );

  switch (style) {
    case 'robe':
      return (
        <>
          {torso(cloth)}
          <Poly p="38,82 62,82 50,114" fill={neckline} />
          <Poly p="38,82 50,114 45,116 33,86" fill="#d4a020" />
          <Poly p="62,82 50,114 55,116 67,86" fill="#d4a020" />
          <Poly p="12,102 88,102 88,108 12,108" fill={shade(cloth, -0.35)} />
          <Poly p="8,120 12,96 22,104 18,120" fill={shade(cloth, -0.2)} />
          <Poly p="92,120 88,96 78,104 82,120" fill={shade(cloth, 0.05)} />
        </>
      );
    case 'vest':
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
    case 'suit':
      return (
        <>
          {torso(cloth)}
          <Poly p="42,82 58,82 50,114" fill="#f4f4f4" />
          <Poly p="36,80 46,86 42,104 28,96" fill={shade(cloth, -0.25)} />
          <Poly p="64,80 54,86 58,104 72,96" fill={shade(cloth, -0.1)} />
          <Poly p="47,86 53,86 54,108 50,114 46,108" fill="#c0392b" />
        </>
      );
    case 'dress':
      return (
        <>
          {torso(cloth)}
          <Poly p="38,82 62,82 50,106" fill={neckline} />
          <Poly p="14,108 86,108 88,113 12,113" fill={shade(cloth, -0.32)} />
          <Poly p="38,82 50,106 44,108 34,88" fill={shade(cloth, -0.2)} />
          <Poly p="62,82 50,106 56,108 66,88" fill={shade(cloth, 0.1)} />
        </>
      );
    case 'armor': {
      const steel = '#9aa3ad';
      return (
        <>
          {torso(steel)}
          <Poly p="40,82 60,82 50,98" fill={shade(steel, -0.35)} />
          <Poly p="38,80 62,80 58,90 42,90" fill={shade(steel, 0.18)} />
          <Poly p="6,98 24,80 36,86 32,106 10,110" fill={cloth} />
          <Poly p="94,98 76,80 64,86 68,106 90,110" fill={shade(cloth, -0.15)} />
          <Poly p="6,98 24,80 28,92 10,102" fill="#fff" opacity={0.12} />
          <Poly p={octagon(18, 96, 2)} fill={shade(steel, 0.3)} />
          <Poly p={octagon(82, 96, 2)} fill={shade(steel, 0.3)} />
          <Poly p="46,100 54,100 56,116 44,116" fill={shade(steel, -0.2)} />
        </>
      );
    }
    case 'sweater':
      return (
        <>
          {torso(cloth)}
          <Poly p="38,74 62,74 62,86 38,86" fill={shade(cloth, -0.1)} />
          <Poly p="38,86 62,86 50,96" fill={neckline} opacity={0} />
          <polyline points="44,90 44,120" stroke={shade(cloth, -0.28)} strokeWidth="1.2" fill="none" />
          <polyline points="56,90 56,120" stroke={shade(cloth, -0.28)} strokeWidth="1.2" fill="none" />
          <polyline points="32,94 30,120" stroke={shade(cloth, -0.28)} strokeWidth="1.2" fill="none" />
          <polyline points="68,94 70,120" stroke={shade(cloth, -0.28)} strokeWidth="1.2" fill="none" />
        </>
      );
    default:
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
}

/** Accesorios de cuello: van sobre la ropa y debajo de la cabeza. */
function NeckWear({ style, c }: { style: HumanAvatar['accessory']; c: Colors }) {
  switch (style) {
    case 'necklace':
      return (
        <>
          <polyline points="36,84 42,94 50,98 58,94 64,84" stroke="#f2c230" strokeWidth="1.6" fill="none" />
          <Poly p={octagon(50, 100, 3)} fill="#e0407a" />
        </>
      );
    case 'scarf':
      return (
        <>
          <Poly p="28,80 72,80 76,92 50,100 24,92" fill={c.hat} />
          <Poly p="28,80 50,86 24,92" fill={shade(c.hat, -0.22)} />
          <Poly p="56,92 68,90 70,116 58,118" fill={shade(c.hat, 0.1)} />
          <Poly p="56,100 68,98 68,104 56,106" fill={shade(c.hat, -0.2)} opacity={0.6} />
        </>
      );
    case 'medal':
      return (
        <>
          <Poly p="40,82 46,82 53,98 47,98" fill="#c0392b" />
          <Poly p="60,82 54,82 47,98 53,98" fill="#2d5fa8" />
          <Poly p={octagon(50, 104, 6)} fill="#f2c230" />
          <Poly p={octagon(50, 104, 3.2)} fill="#d49a10" />
        </>
      );
    case 'bowtie':
      return (
        <>
          <Poly p="40,85 50,90 40,96" fill="#c0392b" />
          <Poly p="60,85 50,90 60,96" fill="#a82e22" />
          <Poly p={octagon(50, 90, 2.6)} fill="#8a2218" />
        </>
      );
    default:
      return null;
  }
}

/** Accesorios de cara: van sobre la cabeza. */
function FaceWear({ style }: { style: HumanAvatar['accessory'] }) {
  switch (style) {
    case 'earring':
      return (
        <>
          <Poly p="20,56 23,56 21.5,62" fill="#f2c230" />
          <Poly p="80,56 77,56 78.5,62" fill="#f2c230" />
          <Poly p={octagon(21.5, 63.5, 1.8)} fill="#e0407a" />
          <Poly p={octagon(78.5, 63.5, 1.8)} fill="#e0407a" />
        </>
      );
    case 'halo':
      return (
        <>
          <polygon points="26,-6 36,-11 50,-12 64,-11 74,-6 64,-2 50,-1 36,-2" stroke="#facc15" strokeWidth="3" fill="none" />
          <polygon points="26,-6 36,-11 50,-12 64,-11 74,-6 64,-2 50,-1 36,-2" stroke="#fff7b0" strokeWidth="1" fill="none" opacity={0.8} />
        </>
      );
    case 'eyepatch':
      return (
        <>
          <polyline points="22,36 30,41 46,38" stroke="#111" strokeWidth="1.2" fill="none" />
          <Poly p="30,40 46,39 46,52 32,52" fill="#16161b" />
        </>
      );
    case 'headphones':
      return (
        <>
          <polyline points="22,46 24,22 50,10 76,22 78,46" stroke="#2b2b33" strokeWidth="4" fill="none" strokeLinejoin="miter" />
          <Poly p="14,40 24,38 24,60 14,58" fill="#e0407a" />
          <Poly p="86,40 76,38 76,60 86,58" fill="#e0407a" />
          <Poly p="14,40 24,38 24,44 14,45" fill="#fff" opacity={0.25} />
        </>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------- humano
// ---------------------------------------------------------------- mascotas
/** Mascota low-poly en la esquina inferior derecha (coordenadas locales 0..34 x 0..30). */
function Pet({ kind }: { kind: HumanAvatar['pet'] }) {
  const eye = <polygon points="9,11 11,11 11,13 9,13" fill="#111" />;
  let body: JSX.Element | null = null;
  switch (kind) {
    case 'dog':
      body = (
        <>
          <Poly p="0,2 5,-3 10,5" fill="#6b4423" />
          <Poly p="18,5 24,-3 26,8" fill="#6b4423" />
          <Poly p="4,4 22,4 26,14 21,26 6,26 0,14" fill="#c98b4a" />
          <Poly p="4,4 13,4 10,14 0,14" fill="#fff" opacity={0.12} />
          <Poly p="12,13 24,13 24,22 12,22" fill="#e8c9a0" />
          <Poly p="21,13 25,13 25,17 21,17" fill="#111" />
          {eye}
          <Poly p="17,9 19,9 19,11 17,11" fill="#111" />
        </>
      );
      break;
    case 'cat':
      body = (
        <>
          <Poly p="2,8 4,-2 10,6" fill="#6b7280" />
          <Poly p="14,6 20,-2 22,8" fill="#6b7280" />
          <Poly p="3,6 19,6 23,16 17,27 5,27 0,16" fill="#9ca3af" />
          <Poly p="3,6 11,6 9,16 0,16" fill="#fff" opacity={0.15} />
          <Poly p="5,12 8,12 8,15 5,15" fill="#a3e635" />
          <Poly p="14,12 17,12 17,15 14,15" fill="#a3e635" />
          <Poly p="10,17 13,17 11.5,19.5" fill="#f472b6" />
          <path d="M2 19 L-4 17 M2 21 L-4 22 M21 19 L27 17 M21 21 L27 22" stroke="#e5e7eb" strokeWidth="0.8" />
        </>
      );
      break;
    case 'rabbit':
      body = (
        <>
          <Poly p="4,12 6,-5 10,-5 11,12" fill="#f3f4f6" />
          <Poly p="13,12 14,-5 18,-5 20,12" fill="#f3f4f6" />
          <Poly p="6,10 7.5,-2 9,-2 9.5,10" fill="#f9a8d4" />
          <Poly p="15,10 16,-2 17.5,-2 18,10" fill="#f9a8d4" />
          <Poly p="4,12 18,12 22,20 18,28 6,28 2,20" fill="#f3f4f6" />
          <Poly p="4,12 11,12 9,20 2,20" fill="#000" opacity={0.06} />
          <Poly p="6,17 8,17 8,19 6,19" fill="#111" />
          <Poly p="14,17 16,17 16,19 14,19" fill="#111" />
          <Poly p="9,21 13,21 11,23.5" fill="#f472b6" />
        </>
      );
      break;
    case 'parrot':
      body = (
        <>
          <Poly p="8,2 20,2 25,14 19,28 10,28 4,14" fill="#dc2626" />
          <Poly p="8,2 14,2 12,14 4,14" fill="#fff" opacity={0.16} />
          <Poly p="14,12 22,12 24,24 16,28" fill="#2563eb" />
          <Poly p="22,7 31,12 22,14" fill="#facc15" />
          <Poly p="12,6 16,6 16,10 12,10" fill="#fff" />
          <Poly p="13,7 15,7 15,9 13,9" fill="#111" />
          <Poly p="10,28 12,34 15,28" fill="#16a34a" />
        </>
      );
      break;
    case 'dragon':
      body = (
        <>
          <Poly p="14,4 22,-6 27,6" fill="#15803d" />
          <Poly p="5,8 8,-1 12,7" fill="#facc15" />
          <Poly p="14,5 18,-1 20,6" fill="#facc15" />
          <Poly p="3,8 17,6 25,12 23,22 9,27 0,19" fill="#22c55e" />
          <Poly p="3,8 11,7 9,19 0,19" fill="#fff" opacity={0.14} />
          <Poly p="6,12 10,12 10,15 6,15" fill="#fde047" />
          <Poly p="7,13 9,13 9,15 7,15" fill="#111" />
          <Poly p="19,14 22,14 22,16 19,16" fill="#14532d" />
          <Poly p="14,24 20,22 18,29" fill="#f97316" opacity={0.9} />
        </>
      );
      break;
    case 'bear':
      body = (
        <>
          <Poly p={octagon(4, 6, 5)} fill="#6b4423" />
          <Poly p={octagon(19, 6, 5)} fill="#6b4423" />
          <Poly p={octagon(4, 6, 2.4)} fill="#c98b4a" />
          <Poly p={octagon(19, 6, 2.4)} fill="#c98b4a" />
          <Poly p="3,6 19,6 24,16 19,28 5,28 0,16" fill="#8b5a2b" />
          <Poly p="3,6 11,6 9,17 0,16" fill="#fff" opacity={0.12} />
          <Poly p="6,16 18,16 18,26 6,26" fill="#d9b382" />
          <Poly p="5,10 7,10 7,12 5,12" fill="#111" />
          <Poly p="16,10 18,10 18,12 16,12" fill="#111" />
          <Poly p="9,16 14,16 11.5,20" fill="#111" />
          <polyline points="8,24 11.5,23 15,24" stroke="#111" strokeWidth="0.8" fill="none" />
          <polyline points="11.5,20 11.5,23" stroke="#111" strokeWidth="0.8" fill="none" />
        </>
      );
      break;
    case 'panda':
      body = (
        <>
          <Poly p={octagon(4, 6, 5)} fill="#111" />
          <Poly p={octagon(19, 6, 5)} fill="#111" />
          <Poly p="3,6 19,6 23,16 18,27 5,27 0,16" fill="#f8fafc" />
          <Poly p="3,6 11,6 9,16 0,16" fill="#000" opacity={0.06} />
          <Poly p="3,12 9,12 9,19 4,19" fill="#111" />
          <Poly p="14,12 20,12 19,19 14,19" fill="#111" />
          <Poly p="5,14 7,14 7,16 5,16" fill="#fff" />
          <Poly p="15,14 17,14 17,16 15,16" fill="#fff" />
          <Poly p="9,19 14,19 11.5,22" fill="#111" />
        </>
      );
      break;
    case 'owl':
      body = (
        <>
          <Poly p="4,2 6,-5 10,2" fill="#6b4423" />
          <Poly p="14,2 18,-5 20,2" fill="#6b4423" />
          <Poly p="4,2 20,2 24,14 20,28 6,28 2,14" fill="#8b5e34" />
          <Poly p="0,14 4,14 6,27 2,24" fill="#5c3d1e" />
          <Poly p="5,8 19,8 19,21 5,21" fill="#e8d3a8" />
          <Poly p={octagon(9, 13, 3.6)} fill="#facc15" />
          <Poly p={octagon(15, 13, 3.6)} fill="#facc15" />
          <Poly p="8,12 10,12 10,14 8,14" fill="#111" />
          <Poly p="14,12 16,12 16,14 14,14" fill="#111" />
          <Poly p="10,16 14,16 12,21" fill="#f97316" />
        </>
      );
      break;
    case 'phoenix':
      body = (
        <>
          <Poly p="10,6 12,-6 15,3 18,-8 20,6" fill="#facc15" />
          <Poly p="16,12 31,0 27,21" fill="#f97316" />
          <Poly p="16,12 31,0 24,10" fill="#fde047" opacity={0.7} />
          <Poly p="8,6 20,6 24,16 18,28 10,28 4,16" fill="#ef4444" />
          <Poly p="8,6 14,6 12,16 4,16" fill="#fff" opacity={0.16} />
          <Poly p="10,28 6,37 12,32 14,40 17,28" fill="#fde047" />
          <Poly p="22,10 29,13 22,15" fill="#facc15" />
          <Poly p="13,9 15,9 15,11 13,11" fill="#111" />
        </>
      );
      break;
    default:
      return null;
  }
  return <g transform="translate(64 90) scale(0.95)">{body}</g>;
}

function Human({ avatar }: { avatar: HumanAvatar }) {
  const c: Colors = {
    skin: PALETTE.skin[avatar.skin] ?? PALETTE.skin[0],
    hair: PALETTE.hairColor[avatar.hairColor] ?? PALETTE.hairColor[0],
    eye: PALETTE.eyeColor[avatar.eyeColor] ?? PALETTE.eyeColor[0],
    cloth: PALETTE.clothesColor[avatar.clothesColor] ?? PALETTE.clothesColor[0],
    hat: HAT_PALETTE[avatar.hatColor] ?? HAT_PALETTE[0],
  };
  const female = avatar.sex === 'female';
  const skinDark = shade(c.skin, -0.18);
  const lip = female ? '#c2384f' : '#7a2e2e';
  // Las mujeres tienen los hombros algo más angostos.
  const bodyTransform = female ? 'translate(50 0) scale(0.9 1) translate(-50 0)' : undefined;

  return (
    <>
      <HairBack style={avatar.hair} c={c} />
      <g transform={bodyTransform}>
        {avatar.clothes === 'hoodie' && <Poly p="28,72 72,72 80,96 20,96" fill={shade(c.cloth, -0.3)} />}
        <Clothes style={avatar.clothes} c={c} />
        <Poly p="40,70 60,70 62,86 50,94 38,86" fill={skinDark} />
        <NeckWear style={avatar.accessory} c={c} />
      </g>
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
      {female && <Poly p="30,52 38,52 36,58 30,57" fill="#e0707a" opacity={0.25} />}
      {female && <Poly p="70,52 62,52 64,58 70,57" fill="#e0707a" opacity={0.25} />}
      <Beard style={avatar.beard} c={c} />
      <Eye cx={38} side="l" style={avatar.eyes} c={c} female={female} />
      <Eye cx={62} side="r" style={avatar.eyes} c={c} female={female} />
      <Mouth style={avatar.mouth} lip={lip} />
      <HairFront style={avatar.hair} c={c} />
      <Hat style={avatar.hat} c={c} />
      <Glasses style={avatar.glasses} />
      <FaceWear style={avatar.accessory} />
      {/* manos apoyadas en la mesa */}
      <Poly p="22,108 34,104 38,118 24,120" fill={c.skin} />
      <Poly p="78,108 66,104 62,118 76,120" fill={shade(c.skin, -0.06)} />
      <Pet kind={avatar.pet} />
    </>
  );
}

// ---------------------------------------------------------------- vehículos
function Apache() {
  const olive = '#55683f';
  return (
    <g transform="translate(0 -4)">
      {/* rotor principal */}
      <Poly p="2,14 50,9 98,14 50,17" fill="#1a1d14" />
      <Poly p="10,13 50,11 90,13 50,15" fill="#9aa88a" opacity={0.35} />
      <Poly p="47,16 53,16 53,30 47,30" fill="#2b2f22" />
      {/* cola */}
      <Poly p="76,38 98,32 98,39 80,48" fill={shade(olive, -0.2)} />
      <Poly p="90,16 98,18 98,38 88,36" fill={olive} />
      <Poly p={octagon(94, 28, 6)} fill="#6b6f66" />
      <Poly p="90,28 98,28 94,22" fill="#2b2f22" opacity={0.6} />
      {/* fuselaje */}
      <Poly p="18,44 34,30 70,30 86,40 94,52 70,58 30,62 14,56" fill={olive} />
      <Poly p="34,30 70,30 86,40 52,38" fill={shade(olive, 0.14)} />
      <Poly p="14,56 30,62 70,58 54,50" fill={shade(olive, -0.28)} />
      <Poly p="54,38 86,40 94,52 62,48" fill={shade(olive, -0.1)} />
      {/* cabina */}
      <Poly p="8,46 22,34 36,34 40,48 22,56" fill="#7fb8d8" />
      <Poly p="22,34 36,34 34,42 18,44" fill="#fff" opacity={0.35} />
      <Poly p="36,34 44,36 40,48" fill={shade(olive, -0.15)} />
      {/* cañón del morro */}
      <Poly p="4,58 14,56 16,62 6,64" fill="#2b2f22" />
      <Poly p="0,64 12,61 12,64 0,67" fill="#1a1d14" />
      {/* alas cortas con cohetes */}
      <Poly p="42,48 66,48 62,56 46,56" fill="#6b6f66" />
      <Poly p="44,56 64,56 64,62 44,62" fill="#3a3d36" />
      <Poly p="40,57 44,56 44,62 40,61" fill="#c0392b" />
      <Poly p="64,56 68,57 68,61 64,62" fill="#c0392b" />
      {/* patines */}
      <polyline points="22,72 78,72" stroke="#2b2f22" strokeWidth="2.6" fill="none" />
      <polyline points="36,60 34,72" stroke="#2b2f22" strokeWidth="2" fill="none" />
      <polyline points="68,58 70,72" stroke="#2b2f22" strokeWidth="2" fill="none" />
    </g>
  );
}

function Motorcycle() {
  const red = '#c0392b';
  const wheel = (cx: number) => (
    <>
      <Poly p={octagon(cx, 96, 21)} fill="#1b1b20" />
      <Poly p={octagon(cx, 96, 13)} fill="#a8adb5" />
      <Poly p={octagon(cx, 96, 9)} fill="#1b1b20" />
      <Poly p={octagon(cx, 96, 3.2)} fill="#d0d4da" />
      <polyline points={`${cx - 9},96 ${cx + 9},96 ${cx},87 ${cx},105`} stroke="#d0d4da" strokeWidth="1" fill="none" />
    </>
  );
  return (
    <g transform="translate(0 -30)">
      {wheel(76)}
      {wheel(22)}
      {/* tubo de escape */}
      <Poly p="60,86 94,90 94,95 60,92" fill="#b9bec6" />
      <Poly p="60,86 94,90 94,91 60,87" fill="#fff" opacity={0.35} />
      {/* motor */}
      <Poly p="36,78 62,76 60,94 40,94" fill="#5a5f69" />
      <Poly p="38,80 60,78 60,84 38,86" fill="#8a909b" />
      {/* carenado trasero y asiento */}
      <Poly p="62,68 86,64 88,78 66,82" fill={shade(red, -0.2)} />
      <Poly p="56,62 82,60 84,68 60,70" fill="#1d1d22" />
      {/* tanque */}
      <Poly p="32,66 58,60 66,72 38,80" fill={red} />
      <Poly p="32,66 58,60 52,66 36,70" fill={shade(red, 0.25)} />
      {/* horquilla, manubrio y faro */}
      <Poly p="22,96 26,62 31,62 29,96" fill="#8a909b" />
      <Poly p="20,54 36,50 38,54 26,58" fill="#1d1d22" />
      <Poly p="18,56 28,52 28,62 18,64" fill="#2b2f36" />
      <Poly p={octagon(16, 62, 5)} fill="#ffe27a" />
      <Poly p="6,80 28,74 28,80 6,86" fill={shade(red, -0.1)} />
    </g>
  );
}

// ---------------------------------------------------------------- componente
interface LowPolyAvatarProps {
  avatar: Avatar;
  /** Ancho en px; el alto se calcula. */
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Personaje de polígonos planos (estilo low-poly), de busto, pensado para verse sentado a la mesa.
 * Quien eligió "no binario" se ve como un vehículo: helicóptero Apache o moto.
 */
export function LowPolyAvatar({ avatar, size = 96, className = '', label }: LowPolyAvatarProps) {
  return (
    <svg
      viewBox="0 -22 100 142"
      width={size}
      height={(size * 142) / 100}
      className={className}
      role="img"
      aria-label={label ?? 'personaje'}
    >
      {avatar.sex === 'nonbinary' ? avatar.vehicle === 'apache' ? <Apache /> : <Motorcycle /> : <Human avatar={avatar} />}
    </svg>
  );
}
