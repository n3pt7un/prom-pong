// source/utils/matchValidation.ts
import { MatchFormat } from '../types';

/**
 * Validates a table tennis score against the given format.
 * Returns null if valid, or an error string if invalid.
 */
export function validateMatchScore(
  s1: number,
  s2: number,
  format: MatchFormat = 'vintage21'
): string | null {
  const target = format === 'vintage21' ? 21 : 11;
  const deuceStart = target - 1;

  const winner = Math.max(s1, s2);
  const loser = Math.min(s1, s2);

  if (isNaN(s1) || isNaN(s2)) return 'Scores must be numbers';
  if (s1 === s2) return 'Draws are not allowed';
  if (winner - loser < 2) return 'Must win by at least 2 points';
  if (winner < target) return `Minimum winning score is ${target}`;
  if (loser < deuceStart && winner > target) {
    return `Invalid score: if opponent has fewer than ${deuceStart} points, winner must score exactly ${target}`;
  }

  return null;
}
