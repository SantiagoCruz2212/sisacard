import { http } from '@/shared/lib/http';
import type { Avatar } from '@/shared/models/avatar';

export const fetchMyAvatar = () => http<{ avatar: Avatar }>('/api/games/avatar/me').then((r) => r.avatar);

export const saveMyAvatar = (avatar: Avatar) =>
  http<{ avatar: Avatar }>('/api/games/avatar/me', { method: 'PUT', body: avatar }).then((r) => r.avatar);
