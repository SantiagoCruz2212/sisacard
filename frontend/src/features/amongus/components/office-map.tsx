import { useTranslation } from 'react-i18next';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';
import type { Avatar } from '@/shared/models/avatar';
import type { AmongUsView } from '@/shared/models/realtime';

interface OfficeMapProps {
  view: AmongUsView;
  meId: string;
  avatarOf: (id: string) => Avatar | undefined;
}

/** Plano de la oficina: salas, estaciones de tarea, cuerpos y personajes (con niebla para quien sigue vivo). */
export function OfficeMap({ view, meId, avatarOf }: OfficeMapProps) {
  const { t } = useTranslation();
  const { map, me } = view;
  const fog = me?.alive === true && view.phase === 'playing';
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#1e293b]" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
      <svg viewBox={`0 0 ${map.width} ${map.height}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="fog" gradientUnits="userSpaceOnUse" cx={me?.x ?? 0} cy={me?.y ?? 0} r={map.vision}>
            <stop offset="70%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.88" />
          </radialGradient>
        </defs>
        {map.rooms.map((r) => (
          <g key={r.id}>
            <polygon
              points={`${r.x + 2},${r.y} ${r.x + r.w - 2},${r.y} ${r.x + r.w},${r.y + 2} ${r.x + r.w},${r.y + r.h - 2} ${r.x + r.w - 2},${r.y + r.h} ${r.x + 2},${r.y + r.h} ${r.x},${r.y + r.h - 2} ${r.x},${r.y + 2}`}
              fill="#334155"
              stroke="#64748b"
              strokeWidth="0.5"
            />
            <text x={r.x + 3} y={r.y + 5} fontSize="3.2" fill="#cbd5e1">
              {t(`amongus.rooms.${r.id}`)}
            </text>
          </g>
        ))}
        {fog && <rect x="0" y="0" width={map.width} height={map.height} fill="url(#fog)" />}
        {me?.tasks.map((task) => (
          <polygon
            key={task.id}
            points={`${task.x},${task.y - 2.4} ${task.x + 2.4},${task.y} ${task.x},${task.y + 2.4} ${task.x - 2.4},${task.y}`}
            fill={task.done ? '#22c55e' : '#facc15'}
            stroke="#0f172a"
            strokeWidth="0.4"
          />
        ))}
        {view.bodies.map((b) => (
          <g key={b.id} transform={`translate(${b.x} ${b.y})`}>
            <title>{t('amongus.body', { name: view.players.find((p) => p.id === b.id)?.username ?? '' })}</title>
            <polygon points="-3,-1 3,-1 3,1 -3,1" fill="#dc2626" />
            <polygon points="-1,-3 1,-3 1,3 -1,3" fill="#dc2626" />
          </g>
        ))}
      </svg>

      {view.players.map((p) => {
        const avatar = avatarOf(p.id);
        const ghost = !p.alive;
        return (
          <div
            key={p.id}
            className="absolute flex -translate-x-1/2 -translate-y-[85%] flex-col items-center transition-[left,top] duration-100 ease-linear"
            style={{ left: pct(p.x, map.width), top: pct(p.y, map.height), opacity: ghost ? 0.45 : 1, filter: ghost ? 'grayscale(1)' : undefined }}
          >
            {avatar && <LowPolyAvatar avatar={avatar} size={30} label={p.username} />}
            <span
              className={`mt-0.5 rounded px-1 text-[10px] leading-tight ${p.impostor ? 'bg-bad text-white' : p.id === meId ? 'bg-primary text-white' : 'bg-black/60 text-white'}`}
            >
              {p.username}
              {p.working ? ' ⚙️' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
