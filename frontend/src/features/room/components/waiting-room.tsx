import { useTranslation } from 'react-i18next';
import type { RoomState } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Chip } from '@/shared/ui/chip';

interface WaitingRoomProps {
  room: RoomState;
  isHost: boolean;
  onStart: () => void;
}

export function WaitingRoom({ room, isHost, onStart }: WaitingRoomProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold">
        {t('room.players', { count: room.players.length, max: room.max })}
      </h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {room.players.map((p) => (
          <Chip key={p.id} variant={p.connected ? 'default' : 'off'}>
            {p.id === room.hostId && '👑 '}
            {p.username}
          </Chip>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted">{t('room.shareCode', { id: room.id, min: room.min })}</p>
      {isHost ? (
        <Button variant="primary" disabled={room.players.length < room.min} onClick={onStart}>
          {t('room.start')}
        </Button>
      ) : (
        <p className="text-sm text-muted">{t('room.waitingHost')}</p>
      )}
    </Card>
  );
}
