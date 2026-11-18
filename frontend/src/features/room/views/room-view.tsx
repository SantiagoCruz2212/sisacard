import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TableScene } from '@/features/room/components/table-scene';
import { WaitingRoom } from '@/features/room/components/waiting-room';
import { useRoom } from '@/features/room/hooks/use-room';
import { GAME_EMOJI } from '@/shared/utils/game-meta';
import { Button } from '@/shared/ui/button';
import { ChatBox } from '@/shared/ui/chat-box';
import { PrivacyToggle } from '@/shared/ui/privacy-toggle';
import { SoundToggle } from '@/shared/ui/sound-toggle';
import { Page, PageHeader, SplitLayout } from '@/shared/ui/page';

/**
 * Sala: cabecera, chat y estado de espera. La pantalla del juego en curso se recibe como `children`
 * (la compone la capa app, porque un feature no puede importar a otro).
 */
export function RoomView({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { room, user, isHost, isSpectator, gameEnded, leave, start, rematch, sendMessage } = useRoom();
  if (!room) return null;

  return (
    <Page>
      <PageHeader title={`${GAME_EMOJI[room.game]} ${t('room.title', { game: t(`gameNames.${room.game}`), id: room.id })}`}>
        <PrivacyToggle />
        <SoundToggle />
        <Button onClick={leave}>{t('room.leave')}</Button>
      </PageHeader>
      <SplitLayout
        main={
          <>
            <TableScene room={room} meId={user?.id ?? ''} />
            {isSpectator && <p className="rounded-lg bg-line px-3 py-2 text-sm">{t('room.spectating')}</p>}
            {children ?? <WaitingRoom room={room} isHost={isHost} onStart={start} />}
            {gameEnded &&
              (isHost ? (
                <Button variant="primary" onClick={rematch}>
                  {t('room.rematch')}
                </Button>
              ) : (
                <p className="text-sm text-muted">{t('room.hostCanRematch')}</p>
              ))}
          </>
        }
        side={<ChatBox title={t('chat.roomTitle')} messages={room.chat} meId={user?.id ?? ''} onSend={sendMessage} />}
      />
    </Page>
  );
}
