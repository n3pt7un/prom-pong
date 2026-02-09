import { K_FACTOR } from '../constants';

/**
 * Calculates the expected score for player A against player B.
 * Returns a value between 0 and 1.
 */
export const getExpectedScore = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculates the new rating for a player/team.
 * @param currentRating The current Elo rating.
 * @param actualScore 1 for win, 0 for loss, 0.5 for draw (draws not supported in pong usually).
 * @param expectedScore The probability of winning calculated beforehand.
 */
export const calculateNewRating = (
  currentRating: number,
  actualScore: number,
  expectedScore: number
): number => {
  return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
};

/**
 * Calculates the Rating Delta for a match.
 * Returns the amount of points the WINNER gains (and LOSER loses).
 */
export const calculateMatchDelta = (
  winnerElo: number,
  loserElo: number
): number => {
  const expectedWinner = getExpectedScore(winnerElo, loserElo);
  // actual score is 1 for winner
  const newWinnerElo = calculateNewRating(winnerElo, 1, expectedWinner);
  return newWinnerElo - winnerElo;
};