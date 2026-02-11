/**
 * ELO calculation logic - shared with frontend eloService.ts
 */
const K_FACTOR = 32;
export const INITIAL_ELO = 1200;

export const getExpectedScore = (ratingA, ratingB) =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

export const calculateNewRating = (currentRating, actualScore, expectedScore) =>
  Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));

export const calculateMatchDelta = (winnerElo, loserElo) => {
  const expectedWinner = getExpectedScore(winnerElo, loserElo);
  const newWinnerElo = calculateNewRating(winnerElo, 1, expectedWinner);
  return newWinnerElo - winnerElo;
};
