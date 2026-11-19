// Mesa de póker low-poly: riel de madera, acolchado de cuero y paño verde hecho de facetas.
// Se dibuja en un lienzo de 100 x 58 que se escala con el contenedor (misma proporción que la escena).
const CX = 50;
const CY = 29;
const RX = 40;
const RY = 17.5;
const SIDES = 18;

type Point = readonly [number, number];

/** Vértices de un óvalo de pocos lados (el "círculo" del estilo low-poly); k lo agranda o encoge. */
const ring = (k: number): Point[] =>
  Array.from({ length: SIDES }, (_, i) => {
    const a = (2 * Math.PI * i) / SIDES;
    return [CX + RX * k * Math.cos(a), CY + RY * k * Math.sin(a)] as const;
  });

const pts = (...ps: Point[]) => ps.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/** Tramo entre dos óvalos: un cuadrilátero por cada lado. */
const band = (outer: Point[], inner: Point[], i: number) =>
  pts(outer[i] as Point, outer[(i + 1) % SIDES] as Point, inner[(i + 1) % SIDES] as Point, inner[i] as Point);

const tone = (token: string, other: string, percent: number) => `color-mix(in srgb, var(--color-${token}) ${percent}%, ${other})`;

const CHIPS: { x: number; y: number; colors: string[] }[] = [
  { x: 43, y: 28.5, colors: ['#c0392b', '#c0392b', '#f2f2f2'] },
  { x: 49.5, y: 31.5, colors: ['#2d5fa8', '#2d5fa8', '#2d5fa8', '#f2f2f2'] },
  { x: 57, y: 28, colors: ['#2f7d4f', '#f2f2f2'] },
  { x: 53, y: 25.5, colors: ['#1c1c22', '#1c1c22', '#d4a020'] },
];

function chipPolygon(cx: number, cy: number, r: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * 0.55 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

export function PokerTable() {
  const woodOuter = ring(1);
  const woodInner = ring(0.955);
  const railInner = ring(0.87);
  const feltRim = ring(0.87);
  const track = ring(0.7);
  const center: Point = [CX, CY];

  return (
    <svg viewBox="0 0 100 58" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {/* sombra sobre el suelo */}
      <polygon points={pts(...ring(1.02).map(([x, y]): Point => [x, y + 1.6]))} fill="#000" fillOpacity={0.35} />

      {/* borde de madera */}
      {woodOuter.map((_, i) => (
        <polygon key={`w${i}`} points={band(woodOuter, woodInner, i)} style={{ fill: i % 2 ? tone('table-edge', 'black', 78) : tone('table-edge', 'white', 88) }} />
      ))}

      {/* riel acolchado de cuero */}
      {woodInner.map((_, i) => (
        <polygon key={`r${i}`} points={band(woodInner, railInner, i)} style={{ fill: i % 2 ? '#2b2226' : '#392d33' }} />
      ))}
      {woodInner.map((_, i) => (
        <polygon key={`rh${i}`} points={pts(woodInner[i] as Point, woodInner[(i + 1) % SIDES] as Point, [(woodInner[(i + 1) % SIDES] as Point)[0], (woodInner[(i + 1) % SIDES] as Point)[1] + 0.5], [(woodInner[i] as Point)[0], (woodInner[i] as Point)[1] + 0.5])} fill="#fff" fillOpacity={0.08} />
      ))}

      {/* paño: abanico de facetas con tonos ligeramente distintos */}
      {feltRim.map((_, i) => (
        <polygon
          key={`f${i}`}
          points={pts(center, feltRim[i] as Point, feltRim[(i + 1) % SIDES] as Point)}
          style={{ fill: [tone('table', 'white', 92), tone('table', 'black', 94), tone('table', 'black', 84)][i % 3] }}
        />
      ))}

      {/* línea de apuestas */}
      <polygon points={pts(...track)} fill="none" stroke="#fff" strokeOpacity={0.28} strokeWidth={0.28} strokeLinejoin="miter" />

      {/* pica low-poly en el centro */}
      <g fill="#fff" fillOpacity={0.09}>
        <polygon points="50,22.5 56,29 53.4,31.6 50,29.6 46.6,31.6 44,29" />
        <polygon points="49,30 51,30 52.4,34.5 47.6,34.5" />
      </g>

      {/* fichas */}
      {CHIPS.map((stack, s) => (
        <g key={s}>
          {stack.colors.map((color, i) => {
            const y = stack.y - i * 0.9;
            return (
              <g key={i}>
                <polygon points={chipPolygon(stack.x, y + 0.7, 2.2)} fill="#000" fillOpacity={0.35} />
                <polygon points={chipPolygon(stack.x, y, 2.2)} fill={color} />
                <polygon points={chipPolygon(stack.x, y, 1.2)} fill="#fff" fillOpacity={0.35} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
