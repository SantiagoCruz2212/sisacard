import { useQuery } from '@tanstack/react-query';
import { fetchPlayerStats } from '@/features/profile/apis/profile-api';
import { useSession } from '@/shared/hooks/use-session';

const percent = (wins = 0, played = 0) => (played ? `${Math.round((wins / played) * 100)}%` : '—');

export function useProfileStats() {
  const { user } = useSession();
  const query = useQuery({
    queryKey: ['profile', 'stats', user?.id],
    queryFn: fetchPlayerStats,
    refetchOnMount: 'always',
  });
  const impostor = query.data?.impostor ?? {};
  const uno = query.data?.uno ?? {};
  const blackjack = query.data?.blackjack ?? {};

  return {
    user,
    isLoading: query.isLoading,
    totalPoints: (impostor.points ?? 0) + (uno.points ?? 0) + (blackjack.points ?? 0),
    impostor: {
      hasPlayed: (impostor.played ?? 0) > 0,
      played: impostor.played ?? 0,
      wins: impostor.wins ?? 0,
      points: impostor.points ?? 0,
      winRate: percent(impostor.wins, impostor.played),
      asImpostor: impostor.impostor_played ?? 0,
      asImpostorRate: percent(impostor.impostor_wins, impostor.impostor_played),
      asCrew: impostor.crew_played ?? 0,
      asCrewRate: percent(impostor.crew_wins, impostor.crew_played),
    },
    blackjack: {
      hasPlayed: (blackjack.played ?? 0) > 0,
      played: blackjack.played ?? 0,
      wins: blackjack.wins ?? 0,
      points: blackjack.points ?? 0,
      winRate: percent(blackjack.wins, blackjack.played),
      busts: blackjack.busts ?? 0,
      cuts: blackjack.cuts ?? 0,
    },
    uno: {
      hasPlayed: (uno.played ?? 0) > 0,
      played: uno.played ?? 0,
      wins: uno.wins ?? 0,
      points: uno.points ?? 0,
      winRate: percent(uno.wins, uno.played),
    },
  };
}
