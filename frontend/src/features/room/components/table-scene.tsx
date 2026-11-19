import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { PokerTable } from '@/features/room/components/poker-table';
import { Smoke } from '@/features/room/components/smoke';
import { useDeathEffects } from '@/features/room/hooks/use-death-effects';
import { useSeatTransitions } from '@/features/room/hooks/use-seat-transitions';
import type { RoomState } from '@/shared/models/realtime';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';
import { activePlayerId, seatInfo } from '@/shared/utils/seat-info';

type Seat = RoomState['players'][number];

/** Posición (en %) de cada asiento sobre una elipse; quien mira la pantalla se sienta abajo. */
function seatPosition(index: number, total: number, meIndex: number) {
  const angle = (Math.PI / 180) * (90 + ((index - meIndex) * 360) / total);
  return { left: 50 + 41 * Math.cos(angle), top: 50 + 33 * Math.sin(angle) };
}

/** Desplazamiento (px) hacia afuera de la mesa: de ahí llegan los que entran y hacia allá se van los que salen. */
function outward(pos: { left: number; top: number }): CSSProperties {
  const vx = pos.left - 50;
  const vy = (pos.top - 50) * 1.6;
  const len = Math.hypot(vx, vy) || 1;
  return { ['--dx' as string]: `${(vx / len) * 150}px`, ['--dy' as string]: `${(vy / len) * 150}px` };
}

interface SeatViewProps {
  player: Seat;
  hostId: string;
  meId: string;
  size: number;
  pos: { left: number; top: number };
  label: string | null;
  dim: boolean;
  active: boolean;
  dead: boolean;
  fresh: boolean;
  motion?: 'enter' | 'leave';
}

function SeatView({ player, hostId, meId, size, pos, label, dim, active, dead, fresh, motion }: SeatViewProps) {
  return (
    <div
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700 ease-in-out ${motion === 'leave' ? 'pointer-events-none z-0' : ''}`}
      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
    >
      <div
        className={`flex flex-col items-center ${dim ? 'opacity-45' : ''} ${motion === 'enter' ? 'seat-enter' : ''} ${motion === 'leave' ? 'seat-leave' : ''}`}
        style={motion ? outward(pos) : undefined}
      >
        {active && <span className="absolute -top-3 z-10 animate-bounce text-lg">🔔</span>}
        <div className={`relative rounded-xl p-0.5 ${active ? 'bg-primary/30 ring-2 ring-primary' : ''} ${fresh ? 'animate-[recoil_0.45s_ease-in-out]' : ''}`}>
          {dead && <Smoke fresh={fresh} />}
          <LowPolyAvatar avatar={player.avatar} size={size} label={player.username} />
        </div>
        <div className="-mt-1 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs">
          {player.id === hostId && <span>👑</span>}
          <span className={`${player.id === meId ? 'font-semibold text-good' : ''} ${player.connected ? '' : 'line-through'}`}>{player.username}</span>
          {label && <span className="text-primary">{label}</span>}
        </div>
      </div>
    </div>
  );
}

export function TableScene({ room, meId }: { room: RoomState; meId: string }) {
  const { t } = useTranslation();
  const total = room.players.length;
  const meIndex = Math.max(
    0,
    room.players.findIndex((p) => p.id === meId),
  );
  const activeId = activePlayerId(room.play);
  const { dead, fresh } = useDeathEffects(room);
  const { entering, ghosts } = useSeatTransitions(room.id, room.players, meId);
  const avatarSize = total > 8 ? 58 : total > 5 ? 68 : 80;

  return (
    <div>
      <div className="relative mx-auto aspect-[100/58] w-full max-w-[620px]">
        <PokerTable />

        {room.players.map((p, i) => {
          const info = seatInfo(room.play, p.id);
          return (
            <SeatView
              key={p.id}
              player={p}
              hostId={room.hostId}
              meId={meId}
              size={avatarSize}
              pos={seatPosition(i, total, meIndex)}
              label={info.label}
              dim={info.dim}
              active={p.id === activeId}
              dead={dead.has(p.id)}
              fresh={fresh.has(p.id)}
              motion={entering.has(p.id) ? 'enter' : undefined}
            />
          );
        })}

        {/* quienes acaban de irse: salen caminando de la mesa */}
        {ghosts.map((g) => (
          <SeatView
            key={g.key}
            player={g.player}
            hostId=""
            meId={meId}
            size={avatarSize}
            pos={seatPosition(g.index, g.total, g.meIndex)}
            label={null}
            dim={false}
            active={false}
            dead={false}
            fresh={false}
            motion="leave"
          />
        ))}
      </div>

      {room.spectators.length > 0 && (
        <p className="mt-1 text-center text-xs text-muted">
          {t('room.spectators', { names: room.spectators.map((s) => s.username).join(', ') })}
        </p>
      )}
    </div>
  );
}
