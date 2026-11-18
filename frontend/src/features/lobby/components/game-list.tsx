import { useTranslation } from 'react-i18next';
import type { GameId } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export function GameList({ onCreateRoom }: { onCreateRoom: (game: GameId) => void }) {
  const { t } = useTranslation();
  const games = [
    { id: 'impostor', name: t('lobby.impostorName'), description: t('lobby.impostorDesc') },
    { id: 'uno', name: t('lobby.unoName'), description: t('lobby.unoDesc') },
    { id: 'blackjack', name: t('lobby.blackjackName'), description: t('lobby.blackjackDesc') },
  ] as const;
  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold">{t('lobby.games')}</h3>
      {games.map((g) => (
        <div key={g.id} className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
          <div>
            <b>{g.name}</b>
            <p className="text-sm text-muted">{g.description}</p>
          </div>
          <Button variant="primary" onClick={() => onCreateRoom(g.id)}>
            {t('lobby.createRoom')}
          </Button>
        </div>
      ))}
    </Card>
  );
}
