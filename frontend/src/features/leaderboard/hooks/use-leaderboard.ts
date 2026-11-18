import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchLeaderboard } from '@/features/leaderboard/apis/leaderboard-api';
import { useSession } from '@/shared/hooks/use-session';
import type { GameId } from '@/shared/models/realtime';

export type LeaderboardFilter = GameId | 'all';
export const LEADERBOARD_FILTERS: LeaderboardFilter[] = ['all', 'impostor', 'uno'];

export function useLeaderboard() {
  const { user } = useSession();
  const [filter, setFilter] = useState<LeaderboardFilter>('all');
  const query = useQuery({
    queryKey: ['leaderboard', filter],
    queryFn: () => fetchLeaderboard(filter),
    refetchOnMount: 'always',
  });
  return { filter, setFilter, entries: query.data ?? [], isLoading: query.isLoading, meId: user?.id ?? '' };
}
