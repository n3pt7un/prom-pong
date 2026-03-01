import { simulateWinsNeeded, getHeadToHeadRecord, calculateSinglesInsights, calculateTeammateStats, identifyBestWorstTeammates } from './insightsService';
import { Player, Match, TeammateStatistics } from '../types';

describe('insightsService', () => {
  describe('simulateWinsNeeded', () => {
    it('should return 0 when player ELO is already equal to target', () => {
      const result = simulateWinsNeeded(1500, 1500);
      expect(result).toBe(0);
    });

    it('should return 0 when player ELO is already higher than target', () => {
      const result = simulateWinsNeeded(1600, 1500);
      expect(result).toBe(0);
    });

    it('should calculate wins needed for small ELO gap', () => {
      // Player at 1200, opponent at 1250 - should be reachable in a few wins
      const result = simulateWinsNeeded(1200, 1250);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should calculate wins needed for medium ELO gap', () => {
      // Player at 1200, opponent at 1400 - should be reachable but take more wins
      const result = simulateWinsNeeded(1200, 1400);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should return null for unreachable ELO gap', () => {
      // Player at 1200, opponent at 3500 - should be unreachable in 20 wins
      const result = simulateWinsNeeded(1200, 3500);
      expect(result).toBeNull();
    });

    it('should return null for very large ELO gap', () => {
      // Player at 1000, opponent at 3000 - definitely unreachable
      const result = simulateWinsNeeded(1000, 3000);
      expect(result).toBeNull();
    });

    it('should handle edge case of 1 win needed', () => {
      // Find an ELO gap that requires exactly 1 win
      // With K=80, a player at 1200 vs 1240 should need 1-2 wins
      const result = simulateWinsNeeded(1200, 1240);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(3);
    });

    it('should use consistent ELO calculation', () => {
      // Test that the function produces consistent results
      const result1 = simulateWinsNeeded(1300, 1450);
      const result2 = simulateWinsNeeded(1300, 1450);
      expect(result1).toBe(result2);
    });

    it('should handle minimum ELO values', () => {
      const result = simulateWinsNeeded(800, 1200);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
    });

    it('should handle maximum reasonable ELO values', () => {
      const result = simulateWinsNeeded(2400, 2500);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('getHeadToHeadRecord', () => {
    const createMatch = (
      id: string,
      type: 'singles' | 'doubles',
      winners: string[],
      losers: string[]
    ): Match => ({
      id,
      type,
      winners,
      losers,
      scoreWinner: 11,
      scoreLoser: 9,
      timestamp: new Date().toISOString(),
      eloChange: 20,
    });

    it('should return empty record when no matches exist', () => {
      const result = getHeadToHeadRecord('player1', 'player2', []);
      expect(result).toEqual({
        wins: 0,
        losses: 0,
        totalMatches: 0,
      });
    });

    it('should count wins correctly', () => {
      const matches = [
        createMatch('m1', 'singles', ['player1'], ['player2']),
        createMatch('m2', 'singles', ['player1'], ['player2']),
        createMatch('m3', 'singles', ['player2'], ['player1']),
      ];
      const result = getHeadToHeadRecord('player1', 'player2', matches);
      expect(result).toEqual({
        wins: 2,
        losses: 1,
        totalMatches: 3,
      });
    });

    it('should only count singles matches', () => {
      const matches = [
        createMatch('m1', 'singles', ['player1'], ['player2']),
        createMatch('m2', 'doubles', ['player1', 'player3'], ['player2', 'player4']),
        createMatch('m3', 'singles', ['player2'], ['player1']),
      ];
      const result = getHeadToHeadRecord('player1', 'player2', matches);
      expect(result).toEqual({
        wins: 1,
        losses: 1,
        totalMatches: 2,
      });
    });

    it('should only count matches between the two specified players', () => {
      const matches = [
        createMatch('m1', 'singles', ['player1'], ['player2']),
        createMatch('m2', 'singles', ['player1'], ['player3']),
        createMatch('m3', 'singles', ['player2'], ['player3']),
      ];
      const result = getHeadToHeadRecord('player1', 'player2', matches);
      expect(result).toEqual({
        wins: 1,
        losses: 0,
        totalMatches: 1,
      });
    });

    it('should handle all losses', () => {
      const matches = [
        createMatch('m1', 'singles', ['player2'], ['player1']),
        createMatch('m2', 'singles', ['player2'], ['player1']),
      ];
      const result = getHeadToHeadRecord('player1', 'player2', matches);
      expect(result).toEqual({
        wins: 0,
        losses: 2,
        totalMatches: 2,
      });
    });

    it('should handle all wins', () => {
      const matches = [
        createMatch('m1', 'singles', ['player1'], ['player2']),
        createMatch('m2', 'singles', ['player1'], ['player2']),
      ];
      const result = getHeadToHeadRecord('player1', 'player2', matches);
      expect(result).toEqual({
        wins: 2,
        losses: 0,
        totalMatches: 2,
      });
    });
  });

  describe('calculateSinglesInsights', () => {
    const createPlayer = (id: string, name: string, eloSingles: number): Player => ({
      id,
      name,
      avatar: '🏓',
      eloSingles,
      eloDoubles: 1200,
      winsSingles: 0,
      lossesSingles: 0,
      streakSingles: 0,
      winsDoubles: 0,
      lossesDoubles: 0,
      streakDoubles: 0,
      joinedAt: new Date().toISOString(),
    });

    const createMatch = (
      id: string,
      winners: string[],
      losers: string[]
    ): Match => ({
      id,
      type: 'singles',
      winners,
      losers,
      scoreWinner: 11,
      scoreLoser: 9,
      timestamp: new Date().toISOString(),
      eloChange: 20,
    });

    it('should return empty array when player not found', () => {
      const players = [createPlayer('p1', 'Alice', 1400)];
      const result = calculateSinglesInsights('nonexistent', players, []);
      expect(result).toEqual([]);
    });

    it('should return empty array when no higher-ranked players exist', () => {
      const players = [
        createPlayer('p1', 'Alice', 1500),
        createPlayer('p2', 'Bob', 1400),
        createPlayer('p3', 'Charlie', 1300),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result).toEqual([]);
    });

    it('should filter only higher-ranked opponents', () => {
      const players = [
        createPlayer('p1', 'Alice', 1300),
        createPlayer('p2', 'Bob', 1400),
        createPlayer('p3', 'Charlie', 1200),
        createPlayer('p4', 'Diana', 1500),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result).toHaveLength(2);
      expect(result.map(i => i.opponentId)).toContain('p2');
      expect(result.map(i => i.opponentId)).toContain('p4');
      expect(result.map(i => i.opponentId)).not.toContain('p3');
    });

    it('should calculate wins needed for each opponent', () => {
      const players = [
        createPlayer('p1', 'Alice', 1300),
        createPlayer('p2', 'Bob', 1350),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result).toHaveLength(1);
      expect(result[0].winsNeeded).not.toBeNull();
      expect(result[0].winsNeeded).toBeGreaterThan(0);
    });

    it('should include head-to-head records', () => {
      const players = [
        createPlayer('p1', 'Alice', 1300),
        createPlayer('p2', 'Bob', 1400),
      ];
      const matches = [
        createMatch('m1', ['p1'], ['p2']),
        createMatch('m2', ['p2'], ['p1']),
        createMatch('m3', ['p2'], ['p1']),
      ];
      const result = calculateSinglesInsights('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].headToHead).toEqual({
        wins: 1,
        losses: 2,
        totalMatches: 3,
      });
    });

    it('should include all required fields in insight objects', () => {
      const players = [
        createPlayer('p1', 'Alice', 1300),
        createPlayer('p2', 'Bob', 1400),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('opponentId', 'p2');
      expect(result[0]).toHaveProperty('opponentName', 'Bob');
      expect(result[0]).toHaveProperty('opponentElo', 1400);
      expect(result[0]).toHaveProperty('playerElo', 1300);
      expect(result[0]).toHaveProperty('winsNeeded');
      expect(result[0]).toHaveProperty('headToHead');
    });

    it('should handle unreachable opponents', () => {
      const players = [
        createPlayer('p1', 'Alice', 1200),
        createPlayer('p2', 'Bob', 3000),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result).toHaveLength(1);
      expect(result[0].winsNeeded).toBeNull();
    });

    it('should not include the player themselves', () => {
      const players = [
        createPlayer('p1', 'Alice', 1300),
        createPlayer('p2', 'Bob', 1400),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result.map(i => i.opponentId)).not.toContain('p1');
    });

    it('should handle multiple higher-ranked opponents', () => {
      const players = [
        createPlayer('p1', 'Alice', 1300),
        createPlayer('p2', 'Bob', 1400),
        createPlayer('p3', 'Charlie', 1350),
        createPlayer('p4', 'Diana', 1500),
      ];
      const result = calculateSinglesInsights('p1', players, []);
      expect(result).toHaveLength(3);
      expect(result.map(i => i.opponentId).sort()).toEqual(['p2', 'p3', 'p4']);
    });
  });

  describe('calculateTeammateStats', () => {
    const createPlayer = (id: string, name: string, eloDoubles: number): Player => ({
      id,
      name,
      avatar: '🏓',
      eloSingles: 1200,
      eloDoubles,
      winsSingles: 0,
      lossesSingles: 0,
      streakSingles: 0,
      winsDoubles: 0,
      lossesDoubles: 0,
      streakDoubles: 0,
      joinedAt: new Date().toISOString(),
    });

    const createDoublesMatch = (
      id: string,
      winners: string[],
      losers: string[],
      eloChange: number,
      isFriendly: boolean = false
    ): Match => ({
      id,
      type: 'doubles',
      winners,
      losers,
      scoreWinner: 11,
      scoreLoser: 9,
      timestamp: new Date().toISOString(),
      eloChange,
      isFriendly,
    });

    it('should return empty array when no doubles matches exist', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
      ];
      const result = calculateTeammateStats('p1', players, []);
      expect(result).toEqual([]);
    });

    it('should filter out friendly matches', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20, true),
        createDoublesMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 20, false),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].matchesPlayed).toBe(1);
    });

    it('should calculate stats for single teammate', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 15),
        createDoublesMatch('m3', ['p3', 'p4'], ['p1', 'p2'], 18),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].teammateId).toBe('p2');
      expect(result[0].teammateName).toBe('Bob');
      expect(result[0].matchesPlayed).toBe(3);
      expect(result[0].wins).toBe(2);
      expect(result[0].losses).toBe(1);
    });

    it('should calculate win rate correctly', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 15),
        createDoublesMatch('m3', ['p1', 'p2'], ['p3', 'p4'], 18),
        createDoublesMatch('m4', ['p3', 'p4'], ['p1', 'p2'], 12),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].winRate).toBe(75); // 3 wins out of 4 matches = 75%
    });

    it('should calculate average ELO change correctly for wins', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 30),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].avgEloChange).toBe(25); // (20 + 30) / 2 = 25
    });

    it('should calculate average ELO change correctly for losses', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p3', 'p4'], ['p1', 'p2'], 20),
        createDoublesMatch('m2', ['p3', 'p4'], ['p1', 'p2'], 30),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].avgEloChange).toBe(-25); // (-20 + -30) / 2 = -25
    });

    it('should calculate average ELO change correctly for mixed results', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p3', 'p4'], ['p1', 'p2'], 30),
        createDoublesMatch('m3', ['p1', 'p2'], ['p3', 'p4'], 10),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].avgEloChange).toBe(0); // (20 - 30 + 10) / 3 = 0
    });

    it('should handle multiple teammates', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
        createPlayer('p5', 'Eve', 1380),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p1', 'p3'], ['p2', 'p5'], 15),
        createDoublesMatch('m3', ['p1', 'p4'], ['p2', 'p3'], 18),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(3);
      expect(result.map(s => s.teammateId).sort()).toEqual(['p2', 'p3', 'p4']);
    });

    it('should include all required fields in statistics objects', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('teammateId', 'p2');
      expect(result[0]).toHaveProperty('teammateName', 'Bob');
      expect(result[0]).toHaveProperty('teammateElo', 1350);
      expect(result[0]).toHaveProperty('matchesPlayed', 1);
      expect(result[0]).toHaveProperty('wins', 1);
      expect(result[0]).toHaveProperty('losses', 0);
      expect(result[0]).toHaveProperty('winRate', 100);
      expect(result[0]).toHaveProperty('avgEloChange', 20);
    });

    it('should filter out singles matches', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
      ];
      const matches: Match[] = [
        {
          id: 'm1',
          type: 'singles',
          winners: ['p1'],
          losers: ['p2'],
          scoreWinner: 11,
          scoreLoser: 9,
          timestamp: new Date().toISOString(),
          eloChange: 20,
        },
        createDoublesMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 15),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].matchesPlayed).toBe(1);
    });

    it('should round win rate to nearest integer', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p3', 'p4'], ['p1', 'p2'], 15),
        createDoublesMatch('m3', ['p3', 'p4'], ['p1', 'p2'], 18),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].winRate).toBe(33); // 1/3 = 33.33... rounded to 33
    });

    it('should round average ELO change to 1 decimal place', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
        createPlayer('p3', 'Charlie', 1300),
        createPlayer('p4', 'Diana', 1320),
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
        createDoublesMatch('m2', ['p1', 'p2'], ['p3', 'p4'], 15),
        createDoublesMatch('m3', ['p1', 'p2'], ['p3', 'p4'], 18),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toHaveLength(1);
      expect(result[0].avgEloChange).toBe(17.7); // (20 + 15 + 18) / 3 = 17.666... rounded to 17.7
    });

    it('should handle player not found in any matches', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        createPlayer('p2', 'Bob', 1350),
      ];
      const matches = [
        createDoublesMatch('m1', ['p2', 'p3'], ['p4', 'p5'], 20),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toEqual([]);
    });

    it('should not include teammate if player data not found', () => {
      const players = [
        createPlayer('p1', 'Alice', 1400),
        // p2 is missing from players array
      ];
      const matches = [
        createDoublesMatch('m1', ['p1', 'p2'], ['p3', 'p4'], 20),
      ];
      const result = calculateTeammateStats('p1', players, matches);
      expect(result).toEqual([]);
    });
  });

  describe('identifyBestWorstTeammates', () => {
    const createTeammateStats = (
      id: string,
      name: string,
      matchesPlayed: number,
      wins: number,
      losses: number
    ): TeammateStatistics => ({
      teammateId: id,
      teammateName: name,
      teammateElo: 1400,
      matchesPlayed,
      wins,
      losses,
      winRate: Math.round((wins / matchesPlayed) * 100),
      avgEloChange: 10,
    });

    it('should return null for both when no teammates have 3+ matches', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 2, 2, 0),
        createTeammateStats('t2', 'Bob', 1, 1, 0),
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best).toBeNull();
      expect(result.worst).toBeNull();
    });

    it('should return same teammate for best and worst when only one qualified', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 3, 2, 1),
        createTeammateStats('t2', 'Bob', 2, 2, 0),
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best).toEqual(teammates[0]);
      expect(result.worst).toEqual(teammates[0]);
    });

    it('should identify best and worst with multiple qualified teammates', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 5, 4, 1), // 80% win rate
        createTeammateStats('t2', 'Bob', 4, 2, 2), // 50% win rate
        createTeammateStats('t3', 'Charlie', 3, 1, 2), // 33% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.teammateId).toBe('t1');
      expect(result.worst?.teammateId).toBe('t3');
    });

    it('should filter out teammates with less than 3 matches', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 5, 5, 0), // 100% win rate but should be included
        createTeammateStats('t2', 'Bob', 2, 2, 0), // 100% win rate but excluded
        createTeammateStats('t3', 'Charlie', 3, 2, 1), // 67% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.teammateId).toBe('t1');
      expect(result.worst?.teammateId).toBe('t3');
    });

    it('should handle empty array', () => {
      const result = identifyBestWorstTeammates([]);
      expect(result.best).toBeNull();
      expect(result.worst).toBeNull();
    });

    it('should correctly sort by win rate', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 10, 5, 5), // 50% win rate
        createTeammateStats('t2', 'Bob', 8, 7, 1), // 87.5% win rate
        createTeammateStats('t3', 'Charlie', 6, 2, 4), // 33% win rate
        createTeammateStats('t4', 'Diana', 4, 3, 1), // 75% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.teammateId).toBe('t2'); // Highest win rate
      expect(result.worst?.teammateId).toBe('t3'); // Lowest win rate
    });

    it('should handle teammates with exactly 3 matches', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 3, 3, 0), // 100% win rate
        createTeammateStats('t2', 'Bob', 3, 0, 3), // 0% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.teammateId).toBe('t1');
      expect(result.worst?.teammateId).toBe('t2');
    });

    it('should handle ties in win rate', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 4, 2, 2), // 50% win rate
        createTeammateStats('t2', 'Bob', 6, 3, 3), // 50% win rate
        createTeammateStats('t3', 'Charlie', 8, 4, 4), // 50% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      // When there are ties, any of them could be best/worst
      expect(result.best).toBeDefined();
      expect(result.worst).toBeDefined();
      expect(result.best?.winRate).toBe(50);
      expect(result.worst?.winRate).toBe(50);
    });

    it('should not mutate the original array', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 5, 4, 1),
        createTeammateStats('t2', 'Bob', 4, 2, 2),
        createTeammateStats('t3', 'Charlie', 3, 1, 2),
      ];
      const originalOrder = teammates.map(t => t.teammateId);
      identifyBestWorstTeammates(teammates);
      const afterOrder = teammates.map(t => t.teammateId);
      expect(afterOrder).toEqual(originalOrder);
    });

    it('should handle large number of teammates', () => {
      const teammates = Array.from({ length: 20 }, (_, i) => 
        createTeammateStats(`t${i}`, `Player${i}`, 5, i % 5, 5 - (i % 5))
      );
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best).toBeDefined();
      expect(result.worst).toBeDefined();
      expect(result.best!.winRate).toBeGreaterThanOrEqual(result.worst!.winRate);
    });

    it('should handle all teammates having same win rate', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 4, 2, 2),
        createTeammateStats('t2', 'Bob', 6, 3, 3),
        createTeammateStats('t3', 'Charlie', 8, 4, 4),
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.winRate).toBe(50);
      expect(result.worst?.winRate).toBe(50);
    });

    it('should handle 0% win rate', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 5, 3, 2), // 60% win rate
        createTeammateStats('t2', 'Bob', 3, 0, 3), // 0% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.teammateId).toBe('t1');
      expect(result.worst?.teammateId).toBe('t2');
      expect(result.worst?.winRate).toBe(0);
    });

    it('should handle 100% win rate', () => {
      const teammates = [
        createTeammateStats('t1', 'Alice', 5, 5, 0), // 100% win rate
        createTeammateStats('t2', 'Bob', 3, 2, 1), // 67% win rate
      ];
      const result = identifyBestWorstTeammates(teammates);
      expect(result.best?.teammateId).toBe('t1');
      expect(result.best?.winRate).toBe(100);
      expect(result.worst?.teammateId).toBe('t2');
    });
  });
});
