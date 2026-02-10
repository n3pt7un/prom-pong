import { Match } from '../types';

export interface Rivalry {
  player1Id: string;
  player2Id: string;
  totalMatches: number;
  player1Wins: number;
  player2Wins: number;
  currentStreak: { playerId: string; count: number };
  longestStreak: { playerId: string; count: number };
  avgScoreMargin: number;
  intensity: 'casual' | 'heated' | 'epic';
  lastMatchDate: string;
}

/**
 * Returns rivalry intensity based on total matches played between two players.
 */
export const getRivalryIntensity = (totalMatches: number): 'casual' | 'heated' | 'epic' => {
  if (totalMatches <= 5) return 'casual';
  if (totalMatches <= 10) return 'heated';
  return 'epic';
};

/**
 * Scans all singles matches and detects rivalries (pairs of players who have
 * played each other at least `minMatches` times). Returns rivalries sorted
 * by totalMatches descending.
 */
export const detectRivalries = (matches: Match[], minMatches: number = 3): Rivalry[] => {
  // Only consider singles matches
  const singlesMatches = matches.filter(m => m.type === 'singles');

  // Build a map of pair -> matches (sorted by timestamp)
  const pairMap = new Map<string, Match[]>();

  for (const match of singlesMatches) {
    const p1 = match.winners[0];
    const p2 = match.losers[0];
    // Create a canonical key so order doesn't matter
    const key = [p1, p2].sort().join('::');
    if (!pairMap.has(key)) {
      pairMap.set(key, []);
    }
    pairMap.get(key)!.push(match);
  }

  const rivalries: Rivalry[] = [];

  for (const [key, pairMatches] of pairMap.entries()) {
    if (pairMatches.length < minMatches) continue;

    const [player1Id, player2Id] = key.split('::');

    // Sort matches chronologically
    const sorted = [...pairMatches].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let player1Wins = 0;
    let player2Wins = 0;
    let totalMargin = 0;

    // Track streaks
    let currentStreak = { playerId: '', count: 0 };
    let longestStreak = { playerId: '', count: 0 };

    for (const match of sorted) {
      const winnerId = match.winners[0];
      const margin = match.scoreWinner - match.scoreLoser;
      totalMargin += margin;

      if (winnerId === player1Id) {
        player1Wins++;
      } else {
        player2Wins++;
      }

      // Update current streak
      if (currentStreak.playerId === winnerId) {
        currentStreak.count++;
      } else {
        currentStreak = { playerId: winnerId, count: 1 };
      }

      // Update longest streak
      if (currentStreak.count > longestStreak.count) {
        longestStreak = { ...currentStreak };
      }
    }

    const totalMatches = pairMatches.length;
    const avgScoreMargin = totalMargin / totalMatches;
    const lastMatchDate = sorted[sorted.length - 1].timestamp;

    rivalries.push({
      player1Id,
      player2Id,
      totalMatches,
      player1Wins,
      player2Wins,
      currentStreak: { ...currentStreak },
      longestStreak: { ...longestStreak },
      avgScoreMargin: Math.round(avgScoreMargin * 10) / 10,
      intensity: getRivalryIntensity(totalMatches),
      lastMatchDate,
    });
  }

  // Sort by totalMatches descending
  rivalries.sort((a, b) => b.totalMatches - a.totalMatches);
  return rivalries;
};

/**
 * Get all rivalries involving a specific player.
 */
export const getPlayerRivalries = (matches: Match[], playerId: string): Rivalry[] => {
  const allRivalries = detectRivalries(matches);
  return allRivalries.filter(
    r => r.player1Id === playerId || r.player2Id === playerId
  );
};

/**
 * Get the top N rivals for a specific player, sorted by total matches descending.
 */
export const getTopRivals = (matches: Match[], playerId: string, count: number = 3): Rivalry[] => {
  return getPlayerRivalries(matches, playerId).slice(0, count);
};
