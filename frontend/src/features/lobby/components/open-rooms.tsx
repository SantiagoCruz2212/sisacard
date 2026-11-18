import { useTranslation } from 'react-i18next';
import type { LobbyState } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

interface OpenRoomsProps {
  rooms: LobbyState['rooms'];
  onJoin: (roomId: string) => void;
}

export function OpenRooms({ rooms, onJoin }: OpenRoomsProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold">{t('lobby.openRooms')}</h3>
      {rooms.length === 0 && <p className="text-sm text-muted">{t('lobby.noRooms')}</p>}
      {rooms.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
          <div>
            <b>
              {t(`gameNames.${r.game}`)} · {r.id}
            </b>
            <p className="text-sm text-muted">
              {t('lobby.roomLine', {
                host: r.host,
                players: r.players,
                max: r.max,
                status: r.status === 'waiting' ? t('lobby.statusWaiting') : t('lobby.statusPlaying'),
              })}
              {r.spectators > 0 && ` · ${t('lobby.watching', { count: r.spectators })}`}
            </p>
          </div>
          <Button disabled={r.status === 'waiting' && r.players >= r.max} onClick={() => onJoin(r.id)}>
            {r.status === 'waiting' ? t('lobby.join') : t('lobby.spectate')}
          </Button>
        </div>
      ))}
    </Card>
  );
}
