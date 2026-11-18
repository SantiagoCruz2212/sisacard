import { useCallback } from 'react';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useGameVoteState, useRealtimeCall } from '@/shared/hooks/use-realtime';
import type { GameId } from '@/shared/models/realtime';

export function useGameVote() {
  const vote = useGameVoteState();
  const call = useRealtimeCall();
  const seconds = useCountdown(vote?.status === 'open' ? vote.deadline : 0, vote?.now ?? 0);
  const totalVotes = vote ? Object.values(vote.tally).reduce((a, b) => a + b, 0) : 0;

  return {
    vote,
    seconds,
    totalVotes,
    isOpen: vote?.status === 'open',
    start: useCallback(() => call('vote:start'), [call]),
    cast: useCallback((game: GameId) => call('vote:cast', { game }), [call]),
    joinRoom: useCallback((roomId: string) => call('room:join', { roomId }), [call]),
  };
}
