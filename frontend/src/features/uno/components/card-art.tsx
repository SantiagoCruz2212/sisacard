import { DARK_COLORS, FILL_CLASS, LIGHT_INK_COLORS, STROKE_CLASS } from '@/features/uno/models/card-style';
import type { UnoCardFace, UnoColor, UnoValue } from '@/shared/models/realtime';

/**
 * Arte de las cartas en SVG, estilo "medallón": cuerpo oscuro con borde del color de la carta y una
 * moneda al centro con el símbolo. Los comodines llevan una rueda de cuatro colores. Todo se dibuja
 * en un lienzo de 58×84 y se escala con el tamaño.
 */

const W = 58;
const H = 84;
const CX = W / 2;
const CY = H / 2;
const R = 19;

/** Valores que se dibujan como texto (el resto tiene ícono). */
const TEXT: Partial<Record<UnoValue, string>> = {
  number: '#',
  draw1: '+1',
  draw2: '+2',
  wildDraw2: '+2',
  draw4: '+4',
  wild4: '+4',
  draw5: '+5',
  double: '×2',
  half: '÷2',
  minus1: '−1',
  plusAll: '++4',
  wildDrawColor: '+?',
};

const DICE: Partial<Record<UnoValue, string>> = { dice4: '4', dice6: '6', dice8: '8', dice12: '12', dice20: '20' };

interface Ink {
  fill: string;
  stroke: string;
}

/** Arco con punta de flecha (de 180° a 323°, en sentido horario), centrado en 0,0. */
function ArcArrow({ ink }: { ink: Ink }) {
  return (
    <>
      <path d="M-10 0 A10 10 0 0 1 8 -6" fill="none" strokeWidth={3.2} strokeLinecap="round" className={ink.stroke} />
      <polygon points="10.4,-2.8 10.8,-8.1 5.2,-3.9" className={ink.fill} />
    </>
  );
}

/** Símbolo centrado en 0,0, pensado para una moneda de radio 19. */
function CardSymbol({ value, ink }: { value: UnoValue; ink: Ink }) {
  const text = /^\d$/.test(value) ? value : TEXT[value];
  if (text) {
    const size = text.length === 1 ? 24 : text.length === 2 ? 19 : 14;
    return (
      <text textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={800} className={ink.fill}>
        {text}
      </text>
    );
  }
  const line = { fill: 'none', strokeWidth: 3.2, strokeLinecap: 'round' as const, className: ink.stroke };
  const dice = DICE[value];
  if (dice) {
    return (
      <>
        <polygon points="0,-13 11.3,-6.5 11.3,6.5 0,13 -11.3,6.5 -11.3,-6.5" {...line} strokeWidth={2.5} strokeLinejoin="round" />
        <text textAnchor="middle" dominantBaseline="central" fontSize={dice.length > 1 ? 10 : 12} fontWeight={800} className={ink.fill}>
          {dice}
        </text>
      </>
    );
  }
  switch (value) {
    case 'skip':
      return (
        <>
          <circle r={10} {...line} />
          <line x1={-7} y1={7} x2={7} y2={-7} {...line} />
        </>
      );
    case 'skipAll':
      return (
        <>
          <circle r={11} {...line} />
          <line x1={-8} y1={4} x2={4} y2={-8} {...line} />
          <line x1={-4} y1={8} x2={8} y2={-4} {...line} />
        </>
      );
    case 'reverse':
      return (
        <g transform="rotate(-35)">
          <path d="M-10 -4 H5" {...line} />
          <polygon points="10,-4 4,-9.5 4,1.5" className={ink.fill} />
          <path d="M10 4 H-5" {...line} />
          <polygon points="-10,4 -4,-1.5 -4,9.5" className={ink.fill} />
        </g>
      );
    case 'rotate':
      return (
        <>
          <ArcArrow ink={ink} />
          <g transform="rotate(180)">
            <ArcArrow ink={ink} />
          </g>
        </>
      );
    case 'replay':
      return (
        <>
          <path d="M-7.07 7.07 A10 10 0 1 1 7.07 7.07" {...line} />
          <polygon points="4.2,9.9 9.6,9.6 4.6,4.6" className={ink.fill} />
        </>
      );
    case 'flip':
      return (
        <>
          <circle r={11} {...line} strokeWidth={2.5} />
          <path d="M0 -11 A11 11 0 0 0 0 11 Z" className={ink.fill} />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M-13 0 Q0 -12 13 0 Q0 12 -13 0 Z" {...line} strokeWidth={2.5} strokeLinejoin="round" />
          <circle r={4.5} className={ink.fill} />
        </>
      );
    case 'swap':
      return (
        <>
          <rect x={-12} y={-8} width={10} height={14} rx={2} transform="rotate(-14)" {...line} strokeWidth={2.4} />
          <rect x={2} y={-6} width={10} height={14} rx={2} transform="rotate(14)" {...line} strokeWidth={2.4} />
        </>
      );
    case 'joker':
      return <polygon points="0,-13 3.5,-4.5 12.4,-4 5.6,1.9 7.6,10.5 0,5.8 -7.6,10.5 -5.6,1.9 -12.4,-4 -3.5,-4.5" className={ink.fill} />;
    case 'target4':
      return (
        <>
          <circle r={11} {...line} strokeWidth={2.5} />
          <line x1={0} y1={-15} x2={0} y2={-9} {...line} strokeWidth={2.5} />
          <line x1={0} y1={9} x2={0} y2={15} {...line} strokeWidth={2.5} />
          <line x1={-15} y1={0} x2={-9} y2={0} {...line} strokeWidth={2.5} />
          <line x1={9} y1={0} x2={15} y2={0} {...line} strokeWidth={2.5} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} className={ink.fill}>
            4
          </text>
        </>
      );
    default:
      return null; // comodín normal: solo la rueda
  }
}

const WHEEL: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
const DARK_WHEEL: UnoColor[] = ['pink', 'teal', 'orange', 'purple'];

/** Rueda de cuatro colores de los comodines (con los colores del lado en juego). */
function Wheel({ dark, x = CX, y = CY, r = R }: { dark: boolean; x?: number; y?: number; r?: number }) {
  const colors = dark ? DARK_WHEEL : WHEEL;
  const quarter = (i: number) => {
    const a0 = (i * Math.PI) / 2 - Math.PI / 2;
    const a1 = a0 + Math.PI / 2;
    const p = (a: number) => `${(x + r * Math.cos(a)).toFixed(2)} ${(y + r * Math.sin(a)).toFixed(2)}`;
    return `M${x} ${y} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`;
  };
  return (
    <>
      {colors.map((c, i) => (
        <path key={c} d={quarter(i)} className={FILL_CLASS[c]} />
      ))}
    </>
  );
}

/** Rueda pequeña para las esquinas del comodín normal. */
const MiniWheel = ({ x, y, dark }: { x: number; y: number; dark: boolean }) => <Wheel dark={dark} x={x} y={y} r={4.5} />;

interface CardArtProps {
  face: UnoCardFace;
  /** Lado oscuro de UNO Flip (cuerpo más oscuro, luna y rueda con colores oscuros). */
  dark?: boolean;
  /** En miniatura se ocultan las esquinas para que se lea. */
  compact?: boolean;
  className?: string;
}

export function CardArt({ face, dark: darkProp, compact = false, className = '' }: CardArtProps) {
  const wild = face.color === 'wild';
  const dark = darkProp ?? (!wild && DARK_COLORS.includes(face.color as UnoColor));
  const color = wild ? null : (face.color as UnoColor);
  const coinInk: Ink =
    color && LIGHT_INK_COLORS.includes(color) ? { fill: 'fill-bg', stroke: 'stroke-bg' } : { fill: 'fill-white', stroke: 'stroke-white' };
  const cornerInk: Ink = color ? { fill: FILL_CLASS[color], stroke: STROKE_CLASS[color] } : { fill: 'fill-fg', stroke: 'stroke-fg' };
  const plainWild = face.value === 'wild';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" focusable="false">
      <rect
        x={1.25}
        y={1.25}
        width={W - 2.5}
        height={H - 2.5}
        rx={7}
        strokeWidth={2.5}
        className={`${dark ? 'fill-black' : 'fill-card'} ${color ? STROKE_CLASS[color] : 'stroke-muted'}`}
      />
      {wild ? (
        <>
          <Wheel dark={dark} />
          {!plainWild && <circle cx={CX} cy={CY} r={15} className={dark ? 'fill-black' : 'fill-card'} />}
          {plainWild && <circle cx={CX} cy={CY} r={4} className={dark ? 'fill-black' : 'fill-card'} />}
        </>
      ) : (
        <circle cx={CX} cy={CY} r={R} className={FILL_CLASS[color as UnoColor]} />
      )}
      <g transform={`translate(${CX} ${CY})${wild && !plainWild ? ' scale(0.8)' : ''}`}>
        <CardSymbol value={face.value} ink={wild ? { fill: 'fill-white', stroke: 'stroke-white' } : coinInk} />
      </g>
      {!compact && (
        <>
          {plainWild ? (
            <>
              <MiniWheel x={10} y={12} dark={dark} />
              <MiniWheel x={W - 10} y={H - 12} dark={dark} />
            </>
          ) : (
            <>
              <g transform="translate(10 12) scale(0.4)">
                <CardSymbol value={face.value} ink={cornerInk} />
              </g>
              <g transform={`translate(${W - 10} ${H - 12}) rotate(180) scale(0.4)`}>
                <CardSymbol value={face.value} ink={cornerInk} />
              </g>
            </>
          )}
          {dark && <path d="M48 7 a5 5 0 1 0 5.5 7.2 a4 4 0 1 1 -5.5 -7.2 z" className="fill-muted" />}
        </>
      )}
    </svg>
  );
}

/** Reverso de las cartas: mismo marco con el logo. */
export function CardBackArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" focusable="false">
      <rect x={1.25} y={1.25} width={W - 2.5} height={H - 2.5} rx={7} strokeWidth={2.5} className="fill-bg stroke-bad" />
      <rect x={6} y={6} width={W - 12} height={H - 12} rx={4} fill="none" strokeWidth={1} strokeDasharray="2 3" className="stroke-bad" />
      <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth={2.5} className="stroke-bad" />
      <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={800} className="fill-bad">
        UNO
      </text>
    </svg>
  );
}
