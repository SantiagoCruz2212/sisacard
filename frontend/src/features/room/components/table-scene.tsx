import { useTranslation } from 'react-i18next';
import type { RoomState } from '@/shared/models/realtime';
import { Smoke } from '@/features/room/components/smoke';
import { useDeathEffects } from '@/features/room/hooks/use-death-effects';
import { activePlayerId, seatInfo } from '@/shared/utils/seat-info';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';

/** Posición (en %) de cada asiento sobre una elipse; quien mira la pantalla se sienta abajo. */
function seatPosition(index: number, total: number, meIndex: number) {
  const angle = (Math.PI / 180) * (90 + ((index - meIndex) * 360) / total);
  return { left: 50 + 41 * Math.cos(angle), top: 50 + 33 * Math.sin(angle) };
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
  const avatarSize = total > 8 ? 58 : total > 5 ? 68 : 80;

  return (
    <div>
      <div className="relative mx-auto h-[360px] w-full max-w-[620px]">
        {/* mesa */}
        <div className="absolute inset-x-[10%] inset-y-[20%] rounded-[50%] border-[10px] border-table-edge bg-table shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]" />

        {room.players.map((p, i) => {
          const pos = seatPosition(i, total, meIndex);
          const info = seatInfo(room.play, p.id);
          const isActive = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${info.dim ? 'opacity-45' : ''}`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              {isActive && <span className="absolute -top-3 z-10 animate-bounce text-lg">🔔</span>}
              <div
                className={`relative rounded-xl p-0.5 ${isActive ? 'bg-primary/30 ring-2 ring-primary' : ''} ${fresh.has(p.id) ? 'animate-[recoil_0.45s_ease-in-out]' : ''}`}
              >
                {dead.has(p.id) && <Smoke fresh={fresh.has(p.id)} />}
                <LowPolyAvatar avatar={p.avatar} size={avatarSize} label={p.username} />
              </div>
              <div className="-mt-1 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs">
                {p.id === room.hostId && <span>👑</span>}
                <span className={`${p.id === meId ? 'font-semibold text-good' : ''} ${p.connected ? '' : 'line-through'}`}>{p.username}</span>
                {info.label && <span className="text-primary">{info.label}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {room.spectators.length > 0 && (
        <p className="mt-1 text-center text-xs text-muted">
          {t('room.spectators', { names: room.spectators.map((s) => s.username).join(', ') })}
        </p>
      )}
    </div>
  );
}
