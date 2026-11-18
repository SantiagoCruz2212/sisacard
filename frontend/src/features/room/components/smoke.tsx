/** Humo sobre el personaje: una nube que sube y se disipa (recién alcanzado) o un hilo tenue (ya fuera). */
const PUFFS = [
  { dx: -14, delay: 0, size: 18 },
  { dx: 10, delay: 0.15, size: 22 },
  { dx: -4, delay: 0.3, size: 16 },
  { dx: 16, delay: 0.5, size: 14 },
  { dx: -18, delay: 0.7, size: 12 },
  { dx: 2, delay: 0.9, size: 20 },
];

export function Smoke({ fresh }: { fresh: boolean }) {
  const puffs = fresh ? PUFFS : PUFFS.slice(0, 2);
  return (
    <div className="pointer-events-none absolute top-1 left-1/2 z-20 h-0 w-0" aria-hidden>
      {puffs.map((p, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-gray-200 blur-[3px] ${fresh ? 'smoke-puff' : 'smoke-wisp'}`}
          style={{
            width: p.size,
            height: p.size,
            left: -p.size / 2,
            animationDelay: `${fresh ? p.delay : i * 1.4}s`,
            ['--dx' as string]: `${p.dx}px`,
          }}
        />
      ))}
    </div>
  );
}
