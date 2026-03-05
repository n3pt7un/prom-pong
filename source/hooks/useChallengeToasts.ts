import { useEffect, useRef, useMemo } from 'react';
import { Match, Player, EloHistoryEntry } from '../types';
import { generateChallenges, getChallengeProgress, computeTierStatus } from '../utils/challengeUtils';

const TIER_TOAST: Record<string, string> = {
  Bronze: '🥉 Bronze tier unlocked!',
  Silver: '🥈 Silver tier unlocked!',
  Gold: '🥇 Gold tier completed!',
};

interface UseChallengeToastsArgs {
  matches: Match[];
  players: Player[];
  history: EloHistoryEntry[];
  currentPlayerId: string | undefined;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function useChallengeToasts({
  matches,
  players,
  history,
  currentPlayerId,
  showToast,
}: UseChallengeToastsArgs) {
  // Track the highest tier notified per challenge ID: e.g. { 'daily-123': 1 } = silver notified
  const notifiedTiers = useRef<Record<string, number>>({});

  const challenges = useMemo(() => generateChallenges(new Date()), []);

  const currentPlayer = useMemo(
    () => players.find(p => p.id === currentPlayerId),
    [players, currentPlayerId]
  );

  useEffect(() => {
    if (!currentPlayerId || !currentPlayer) return;

    for (const challenge of challenges) {
      const progress = getChallengeProgress(
        challenge,
        matches,
        players,
        history,
        currentPlayerId,
        currentPlayer.eloSingles
      );

      const { highestTier } = computeTierStatus(progress, challenge.tiers);
      const previouslyNotified = notifiedTiers.current[challenge.id] ?? -1;

      // Fire a toast for each newly crossed tier
      for (let tier = previouslyNotified + 1; tier <= highestTier; tier++) {
        const tierLabel = challenge.tiers[tier].label;
        const tierXP = challenge.tiers[tier].xp;
        const prefix = TIER_TOAST[tierLabel] ?? '🏆 Tier unlocked!';
        showToast(`${prefix} "${challenge.title}" — +${tierXP} XP`);
      }

      if (highestTier > previouslyNotified) {
        notifiedTiers.current[challenge.id] = highestTier;
      }
    }
  }, [matches, players, history, currentPlayerId, currentPlayer, challenges, showToast]);
}
