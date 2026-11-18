import { http } from '@/shared/lib/http';
import type { GameId, LeaderboardEntry } from '@/shared/models/realtime';

export const fetchLeaderboard = (game: GameId | 'all') =>
  http<{ entries: LeaderboardEntry[] }>(`/api/games/leaderboard${game === 'all' ? '' : `?game=${game}`}`).then((r) => r.entries);
