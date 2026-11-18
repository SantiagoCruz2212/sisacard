import { useTranslation } from 'react-i18next';
import type { AppUser } from '@/shared/models/realtime';
import { Card } from '@/shared/ui/card';
import { Chip } from '@/shared/ui/chip';

export function OnlineUsers({ users }: { users: AppUser[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold">{t('lobby.online', { count: users.length })}</h3>
      <div className="flex flex-wrap gap-2">
        {users.map((u) => (
          <Chip key={u.id}>{u.username}</Chip>
        ))}
      </div>
    </Card>
  );
}
