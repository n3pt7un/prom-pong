import { Match } from '../types';

/**
 * Predicts the probability of player A winning against player B
 * based on their ELO ratings. Uses the standard ELO expected score formula.
 * @returns A value between 0 and 1 representing player A's win probability.
 */
export const predictWinProbability = (playerAElo: number, playerBElo: number): number => {
  return 1 / (1 + Math.pow(10, (playerBElo - playerAElo) / 400));
};

/**
 * Predicts the probability of team 1 winning against team 2 in doubles,
 * using the average ELO of each team.
 * @returns A value between 0 and 1 representing team 1's win probability.
 */
export const predictDoublesWinProbability = (team1Elos: number[], team2Elos: number[]): number => {
  const avgElo1 = team1Elos.reduce((sum, e) => sum + e, 0) / team1Elos.length;
  const avgElo2 = team2Elos.reduce((sum, e) => sum + e, 0) / team2Elos.length;
  return predictWinProbability(avgElo1, avgElo2);
};

/**
 * Returns a confidence level for a prediction based on the number of
 * historical matches between the two players/teams.
 */
export const getConfidenceLevel = (matchesBetween: number): 'low' | 'medium' | 'high' => {
  if (matchesBetween < 3) return 'low';
  if (matchesBetween <= 10) return 'medium';
  return 'high';
};

/**
 * Formats a probability (0-1) as a percentage string like "65%".
 */
export const formatProbability = (prob: number): string => {
  return `${Math.round(prob * 100)}%`;
};

/**
 * Counts the number of historical matches between two specific players.
 * Considers matches where either player is in winners or losers.
 */
export const getMatchesBetweenPlayers = (
  matches: Match[],
  playerAId: string,
  playerBId: string
): number => {
  return matches.filter(match => {
    const allPlayers = [...match.winners, ...match.losers];
    return allPlayers.includes(playerAId) && allPlayers.includes(playerBId);
  }).length;
};
