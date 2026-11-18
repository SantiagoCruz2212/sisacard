import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GameList } from '@/features/lobby/components/game-list';
import { OnlineUsers } from '@/features/lobby/components/online-users';
import { OpenRooms } from '@/features/lobby/components/open-rooms';
import { useLobby } from '@/features/lobby/hooks/use-lobby';
import { Button } from '@/shared/ui/button';
import { ChatBox } from '@/shared/ui/chat-box';
import { Page, PageHeader, SplitLayout } from '@/shared/ui/page';

/** El panel de votación (otro feature) llega como `children`: lo compone la capa app. */
export function LobbyView({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout, lobby, chat, createRoom, joinRoom, sendMessage } = useLobby();

  return (
    <Page>
      <PageHeader title={`🃏 ${t('common.appName')}`}>
        <Link to="/character" className="rounded-lg bg-line px-3.5 py-2 text-sm">
          {t('lobby.character')}
        </Link>
        <Link to="/leaderboard" className="rounded-lg bg-line px-3.5 py-2 text-sm">
          {t('lobby.leaderboard')}
        </Link>
        <Link to="/profile" className="rounded-lg bg-line px-3.5 py-2 text-sm">
          👤 {user?.username}
        </Link>
        <Button variant="ghost" onClick={logout}>
          {t('common.logout')}
        </Button>
      </PageHeader>
      <SplitLayout
        main={
          <>
            {children}
            <GameList onCreateRoom={createRoom} />
            <OpenRooms rooms={lobby.rooms} onJoin={joinRoom} />
            <OnlineUsers users={lobby.online} />
          </>
        }
        side={<ChatBox title={t('chat.lobbyTitle')} messages={chat} meId={user?.id ?? ''} onSend={sendMessage} />}
      />
    </Page>
  );
}
