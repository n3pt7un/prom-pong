import {
  SinglesInsight,
  TeammateStatistics,
  SinglesSortBy,
  TeammateSortBy,
  SortOrder,
} from '../types';

/**
 * Sort singles insights by specified criteria and order.
 * Handles null values in winsNeeded by placing them at the end for ascending,
 * or at the beginning for descending order.
 */
export const sortSinglesInsights = (
  insights: SinglesInsight[],
  sortBy: SinglesSortBy,
  sortOrder: SortOrder
): SinglesInsight[] => {
  const sorted = [...insights].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'winsNeeded') {
      // Handle null values: null means unreachable (20+ wins)
      // For ascending: null goes to end (treated as infinity)
      // For descending: null goes to beginning (treated as highest)
      if (a.winsNeeded === null && b.winsNeeded === null) {
        comparison = 0;
      } else if (a.winsNeeded === null) {
        comparison = 1; // a goes after b
      } else if (b.winsNeeded === null) {
        comparison = -1; // a goes before b
      } else {
        comparison = a.winsNeeded - b.winsNeeded;
      }
    } else if (sortBy === 'opponentElo') {
      comparison = a.opponentElo - b.opponentElo;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

/**
 * Sort teammate statistics by specified criteria and order.
 */
export const sortTeammateStats = (
  stats: TeammateStatistics[],
  sortBy: TeammateSortBy,
  sortOrder: SortOrder
): TeammateStatistics[] => {
  const sorted = [...stats].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'winRate') {
      comparison = a.winRate - b.winRate;
    } else if (sortBy === 'matchesPlayed') {
      comparison = a.matchesPlayed - b.matchesPlayed;
    } else if (sortBy === 'avgEloChange') {
      comparison = a.avgEloChange - b.avgEloChange;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
};
