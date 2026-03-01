import { sortSinglesInsights, sortTeammateStats } from './insightsSorting';
import { SinglesInsight, TeammateStatistics } from '../types';

describe('sortSinglesInsights', () => {
  const mockInsights: SinglesInsight[] = [
    {
      opponentId: '1',
      opponentName: 'Alice',
      opponentElo: 1500,
      playerElo: 1400,
      winsNeeded: 5,
      headToHead: { wins: 2, losses: 3, totalMatches: 5 },
    },
    {
      opponentId: '2',
      opponentName: 'Bob',
      opponentElo: 1600,
      playerElo: 1400,
      winsNeeded: 10,
      headToHead: { wins: 1, losses: 4, totalMatches: 5 },
    },
    {
      opponentId: '3',
      opponentName: 'Charlie',
      opponentElo: 1450,
      playerElo: 1400,
      winsNeeded: 3,
      headToHead: { wins: 3, losses: 2, totalMatches: 5 },
    },
    {
      opponentId: '4',
      opponentName: 'Diana',
      opponentElo: 1800,
      playerElo: 1400,
      winsNeeded: null, // Unreachable
      headToHead: { wins: 0, losses: 5, totalMatches: 5 },
    },
  ];

  describe('sorting by winsNeeded', () => {
    it('should sort by winsNeeded ascending', () => {
      const sorted = sortSinglesInsights(mockInsights, 'winsNeeded', 'asc');
      expect(sorted[0].winsNeeded).toBe(3);
      expect(sorted[1].winsNeeded).toBe(5);
      expect(sorted[2].winsNeeded).toBe(10);
      expect(sorted[3].winsNeeded).toBe(null);
    });

    it('should sort by winsNeeded descending', () => {
      const sorted = sortSinglesInsights(mockInsights, 'winsNeeded', 'desc');
      expect(sorted[0].winsNeeded).toBe(null);
      expect(sorted[1].winsNeeded).toBe(10);
      expect(sorted[2].winsNeeded).toBe(5);
      expect(sorted[3].winsNeeded).toBe(3);
    });

    it('should handle all null winsNeeded values', () => {
      const allNull: SinglesInsight[] = [
        { ...mockInsights[0], winsNeeded: null },
        { ...mockInsights[1], winsNeeded: null },
      ];
      const sorted = sortSinglesInsights(allNull, 'winsNeeded', 'asc');
      expect(sorted).toHaveLength(2);
      expect(sorted[0].winsNeeded).toBe(null);
      expect(sorted[1].winsNeeded).toBe(null);
    });

    it('should handle empty array', () => {
      const sorted = sortSinglesInsights([], 'winsNeeded', 'asc');
      expect(sorted).toEqual([]);
    });
  });

  describe('sorting by opponentElo', () => {
    it('should sort by opponentElo ascending', () => {
      const sorted = sortSinglesInsights(mockInsights, 'opponentElo', 'asc');
      expect(sorted[0].opponentElo).toBe(1450);
      expect(sorted[1].opponentElo).toBe(1500);
      expect(sorted[2].opponentElo).toBe(1600);
      expect(sorted[3].opponentElo).toBe(1800);
    });

    it('should sort by opponentElo descending', () => {
      const sorted = sortSinglesInsights(mockInsights, 'opponentElo', 'desc');
      expect(sorted[0].opponentElo).toBe(1800);
      expect(sorted[1].opponentElo).toBe(1600);
      expect(sorted[2].opponentElo).toBe(1500);
      expect(sorted[3].opponentElo).toBe(1450);
    });
  });

  it('should not mutate original array', () => {
    const original = [...mockInsights];
    sortSinglesInsights(mockInsights, 'winsNeeded', 'asc');
    expect(mockInsights).toEqual(original);
  });
});

describe('sortTeammateStats', () => {
  const mockStats: TeammateStatistics[] = [
    {
      teammateId: '1',
      teammateName: 'Alice',
      teammateElo: 1500,
      matchesPlayed: 10,
      wins: 7,
      losses: 3,
      winRate: 70,
      avgEloChange: 5.5,
    },
    {
      teammateId: '2',
      teammateName: 'Bob',
      teammateElo: 1400,
      matchesPlayed: 5,
      wins: 2,
      losses: 3,
      winRate: 40,
      avgEloChange: -3.2,
    },
    {
      teammateId: '3',
      teammateName: 'Charlie',
      teammateElo: 1600,
      matchesPlayed: 8,
      wins: 6,
      losses: 2,
      winRate: 75,
      avgEloChange: 8.1,
    },
    {
      teammateId: '4',
      teammateName: 'Diana',
      teammateElo: 1450,
      matchesPlayed: 3,
      wins: 1,
      losses: 2,
      winRate: 33,
      avgEloChange: -5.0,
    },
  ];

  describe('sorting by winRate', () => {
    it('should sort by winRate ascending', () => {
      const sorted = sortTeammateStats(mockStats, 'winRate', 'asc');
      expect(sorted[0].winRate).toBe(33);
      expect(sorted[1].winRate).toBe(40);
      expect(sorted[2].winRate).toBe(70);
      expect(sorted[3].winRate).toBe(75);
    });

    it('should sort by winRate descending', () => {
      const sorted = sortTeammateStats(mockStats, 'winRate', 'desc');
      expect(sorted[0].winRate).toBe(75);
      expect(sorted[1].winRate).toBe(70);
      expect(sorted[2].winRate).toBe(40);
      expect(sorted[3].winRate).toBe(33);
    });
  });

  describe('sorting by matchesPlayed', () => {
    it('should sort by matchesPlayed ascending', () => {
      const sorted = sortTeammateStats(mockStats, 'matchesPlayed', 'asc');
      expect(sorted[0].matchesPlayed).toBe(3);
      expect(sorted[1].matchesPlayed).toBe(5);
      expect(sorted[2].matchesPlayed).toBe(8);
      expect(sorted[3].matchesPlayed).toBe(10);
    });

    it('should sort by matchesPlayed descending', () => {
      const sorted = sortTeammateStats(mockStats, 'matchesPlayed', 'desc');
      expect(sorted[0].matchesPlayed).toBe(10);
      expect(sorted[1].matchesPlayed).toBe(8);
      expect(sorted[2].matchesPlayed).toBe(5);
      expect(sorted[3].matchesPlayed).toBe(3);
    });
  });

  describe('sorting by avgEloChange', () => {
    it('should sort by avgEloChange ascending', () => {
      const sorted = sortTeammateStats(mockStats, 'avgEloChange', 'asc');
      expect(sorted[0].avgEloChange).toBe(-5.0);
      expect(sorted[1].avgEloChange).toBe(-3.2);
      expect(sorted[2].avgEloChange).toBe(5.5);
      expect(sorted[3].avgEloChange).toBe(8.1);
    });

    it('should sort by avgEloChange descending', () => {
      const sorted = sortTeammateStats(mockStats, 'avgEloChange', 'desc');
      expect(sorted[0].avgEloChange).toBe(8.1);
      expect(sorted[1].avgEloChange).toBe(5.5);
      expect(sorted[2].avgEloChange).toBe(-3.2);
      expect(sorted[3].avgEloChange).toBe(-5.0);
    });
  });

  it('should handle empty array', () => {
    const sorted = sortTeammateStats([], 'winRate', 'asc');
    expect(sorted).toEqual([]);
  });

  it('should not mutate original array', () => {
    const original = [...mockStats];
    sortTeammateStats(mockStats, 'winRate', 'asc');
    expect(mockStats).toEqual(original);
  });
});
