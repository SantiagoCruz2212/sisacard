import { http } from '@/shared/lib/http';
import type { PlayerStats } from '@/shared/models/realtime';

export const fetchPlayerStats = () => http<{ stats: PlayerStats }>('/api/games/stats/me').then((r) => r.stats);
