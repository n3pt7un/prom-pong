import { Match, EloHistoryEntry } from '../types';

/**
 * Calculates a rolling win rate for a player over their match history.
 * @param window The rolling window size (default 10).
 * @returns Array of { index, winRate } where winRate is 0-1.
 */
export const calculateRollingWinRate = (
  matches: Match[],
  playerId: string,
  window: number = 10
): { index: number; winRate: number }[] => {
  // Get player's matches sorted chronologically
  const playerMatches = matches
    .filter(m => m.winners.includes(playerId) || m.losers.includes(playerId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (playerMatches.length === 0) return [];

  const results: { index: number; winRate: number }[] = [];
  const windowResults: boolean[] = [];

  for (let i = 0; i < playerMatches.length; i++) {
    const isWin = playerMatches[i].winners.includes(playerId);
    windowResults.push(isWin);

    // Keep only the last `window` results
    if (windowResults.length > window) {
      windowResults.shift();
    }

    const wins = windowResults.filter(Boolean).length;
    const winRate = wins / windowResults.length;

    results.push({ index: i, winRate });
  }

  return results;
};

/**
 * Gets win rate against each opponent for a given player.
 * Only includes opponents with at least 1 match.
 * Note: opponentName is not resolved here — caller must map opponentId to name.
 */
export const getWinRateByOpponent = (
  matches: Match[],
  playerId: string
): { opponentId: string; wins: number; losses: number; winRate: number }[] => {
  const opponentStats = new Map<string, { wins: number; losses: number }>();

  const playerMatches = matches.filter(
    m => m.winners.includes(playerId) || m.losers.includes(playerId)
  );

  for (const match of playerMatches) {
    const isWin = match.winners.includes(playerId);
    const opponents = isWin ? match.losers : match.winners;

    for (const oppId of opponents) {
      if (!opponentStats.has(oppId)) {
        opponentStats.set(oppId, { wins: 0, losses: 0 });
      }
      const stats = opponentStats.get(oppId)!;
      if (isWin) {
        stats.wins++;
      } else {
        stats.losses++;
      }
    }
  }

  return Array.from(opponentStats.entries()).map(([opponentId, stats]) => ({
    opponentId,
    wins: stats.wins,
    losses: stats.losses,
    winRate: stats.wins + stats.losses > 0
      ? stats.wins / (stats.wins + stats.losses)
      : 0,
  }));
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Gets win/loss stats grouped by day of the week.
 */
export const getDayOfWeekStats = (
  matches: Match[],
  playerId: string
): { day: string; wins: number; losses: number; winRate: number }[] => {
  const dayStats = DAY_NAMES.map(day => ({ day, wins: 0, losses: 0, winRate: 0 }));

  const playerMatches = matches.filter(
    m => m.winners.includes(playerId) || m.losers.includes(playerId)
  );

  for (const match of playerMatches) {
    const dayIndex = new Date(match.timestamp).getDay();
    const isWin = match.winners.includes(playerId);
    if (isWin) {
      dayStats[dayIndex].wins++;
    } else {
      dayStats[dayIndex].losses++;
    }
  }

  // Calculate win rates
  for (const stat of dayStats) {
    const total = stat.wins + stat.losses;
    stat.winRate = total > 0 ? stat.wins / total : 0;
  }

  return dayStats;
};

/**
 * Analyzes scores for a player across all their matches.
 */
export const getScoreAnalysis = (
  matches: Match[],
  playerId: string
): {
  avgWinMargin: number;
  closestGame: { score: string; opponent: string };
  biggestBlowout: { score: string; opponent: string };
  totalEloGained: number;
} => {
  const playerMatches = matches.filter(
    m => m.winners.includes(playerId) || m.losers.includes(playerId)
  );

  let totalWinMargin = 0;
  let winCount = 0;
  let totalEloGained = 0;

  let closestMargin = Infinity;
  let closestGame = { score: 'N/A', opponent: 'N/A' };

  let biggestMargin = -Infinity;
  let biggestBlowout = { score: 'N/A', opponent: 'N/A' };

  for (const match of playerMatches) {
    const isWin = match.winners.includes(playerId);
    const margin = match.scoreWinner - match.scoreLoser;
    const opponents = isWin ? match.losers : match.winners;
    const opponentId = opponents[0] || 'unknown';

    if (isWin) {
      totalWinMargin += margin;
      winCount++;
      totalEloGained += match.eloChange;
    } else {
      totalEloGained -= match.eloChange;
    }

    // Track closest game
    if (margin < closestMargin) {
      closestMargin = margin;
      closestGame = {
        score: `${match.scoreWinner}-${match.scoreLoser}`,
        opponent: opponentId,
      };
    }

    // Track biggest blowout (only wins)
    if (isWin && margin > biggestMargin) {
      biggestMargin = margin;
      biggestBlowout = {
        score: `${match.scoreWinner}-${match.scoreLoser}`,
        opponent: opponentId,
      };
    }
  }

  return {
    avgWinMargin: winCount > 0 ? Math.round((totalWinMargin / winCount) * 10) / 10 : 0,
    closestGame,
    biggestBlowout,
    totalEloGained,
  };
};

/**
 * Calculates ELO volatility (standard deviation of ELO changes)
 * over the last `window` entries.
 */
export const getEloVolatility = (
  history: EloHistoryEntry[],
  playerId: string,
  window: number = 20
): number => {
  const playerHistory = history
    .filter(h => h.playerId === playerId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (playerHistory.length < 2) return 0;

  // Take last `window` entries
  const recent = playerHistory.slice(-window);

  // Calculate ELO changes between consecutive entries
  const changes: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    changes.push(recent[i].newElo - recent[i - 1].newElo);
  }

  if (changes.length === 0) return 0;

  // Standard deviation
  const mean = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / changes.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
};

/**
 * Returns the recent form (W/L results) for a player.
 * @param count Number of recent matches to include (default 10).
 */
export const getRecentForm = (
  matches: Match[],
  playerId: string,
  count: number = 10
): ('W' | 'L')[] => {
  const playerMatches = matches
    .filter(m => m.winners.includes(playerId) || m.losers.includes(playerId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const recent = playerMatches.slice(-count);

  return recent.map(m => (m.winners.includes(playerId) ? 'W' : 'L'));
};
