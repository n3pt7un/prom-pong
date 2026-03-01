import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { getPlayerStats, getStatsForGameType } from './gameTypeStats';
import { Player, GameType } from '../types';

/**
 * Arbitrary generator for Player objects with random stats
 */
const playerArbitrary = fc.record({
  id: fc.string(),
  name: fc.string(),
  avatar: fc.string(),
  eloSingles: fc.integer({ min: 0, max: 3000 }),
  eloDoubles: fc.integer({ min: 0, max: 3000 }),
  winsSingles: fc.integer({ min: 0, max: 1000 }),
  lossesSingles: fc.integer({ min: 0, max: 1000 }),
  streakSingles: fc.integer({ min: -50, max: 50 }),
  winsDoubles: fc.integer({ min: 0, max: 1000 }),
  lossesDoubles: fc.integer({ min: 0, max: 1000 }),
  streakDoubles: fc.integer({ min: -50, max: 50 }),
  joinedAt: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(ts => new Date(ts).toISOString()),
}) as fc.Arbitrary<Player>;

/**
 * Arbitrary generator for GameType
 */
const gameTypeArbitrary: fc.Arbitrary<GameType> = fc.constantFrom('singles', 'doubles');

describe('gameTypeStats utility functions', () => {
  describe('Property 1: Game-type-specific stats extraction', () => {
    it('getPlayerStats returns correct singles properties when gameType is singles', () => {
      fc.assert(
        fc.property(playerArbitrary, (player) => {
          // **Validates: Requirements 1.1, 1.2**
          const stats = getPlayerStats(player, 'singles');
          
          expect(stats.wins).toBe(player.winsSingles);
          expect(stats.losses).toBe(player.lossesSingles);
          expect(stats.streak).toBe(player.streakSingles);
          expect(stats.elo).toBe(player.eloSingles);
        }),
        { numRuns: 100 }
      );
    });

    it('getPlayerStats returns correct doubles properties when gameType is doubles', () => {
      fc.assert(
        fc.property(playerArbitrary, (player) => {
          // **Validates: Requirements 1.1, 1.2**
          const stats = getPlayerStats(player, 'doubles');
          
          expect(stats.wins).toBe(player.winsDoubles);
          expect(stats.losses).toBe(player.lossesDoubles);
          expect(stats.streak).toBe(player.streakDoubles);
          expect(stats.elo).toBe(player.eloDoubles);
        }),
        { numRuns: 100 }
      );
    });

    it('getPlayerStats returns correct properties for any game type', () => {
      fc.assert(
        fc.property(playerArbitrary, gameTypeArbitrary, (player, gameType) => {
          // **Validates: Requirements 1.1, 1.2**
          const stats = getPlayerStats(player, gameType);
          
          if (gameType === 'singles') {
            expect(stats.wins).toBe(player.winsSingles);
            expect(stats.losses).toBe(player.lossesSingles);
            expect(stats.streak).toBe(player.streakSingles);
            expect(stats.elo).toBe(player.eloSingles);
          } else {
            expect(stats.wins).toBe(player.winsDoubles);
            expect(stats.losses).toBe(player.lossesDoubles);
            expect(stats.streak).toBe(player.streakDoubles);
            expect(stats.elo).toBe(player.eloDoubles);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('getStatsForGameType calculates winRate correctly', () => {
      fc.assert(
        fc.property(playerArbitrary, gameTypeArbitrary, (player, gameType) => {
          // **Validates: Requirements 2.3, 2.4**
          const stats = getStatsForGameType(player, gameType);
          
          const expectedWins = gameType === 'singles' ? player.winsSingles : player.winsDoubles;
          const expectedLosses = gameType === 'singles' ? player.lossesSingles : player.lossesDoubles;
          const expectedTotalGames = expectedWins + expectedLosses;
          const expectedWinRate = expectedTotalGames > 0 
            ? Math.round((expectedWins / expectedTotalGames) * 100) 
            : 0;
          
          expect(stats.wins).toBe(expectedWins);
          expect(stats.losses).toBe(expectedLosses);
          expect(stats.totalGames).toBe(expectedTotalGames);
          expect(stats.winRate).toBe(expectedWinRate);
        }),
        { numRuns: 100 }
      );
    });

    it('getStatsForGameType returns 0 winRate when totalGames is 0', () => {
      fc.assert(
        fc.property(gameTypeArbitrary, (gameType) => {
          // **Validates: Requirements 2.3, 2.4**
          const player: Player = {
            id: 'test',
            name: 'Test Player',
            avatar: 'avatar.png',
            eloSingles: 1200,
            eloDoubles: 1200,
            winsSingles: 0,
            lossesSingles: 0,
            streakSingles: 0,
            winsDoubles: 0,
            lossesDoubles: 0,
            streakDoubles: 0,
            joinedAt: new Date().toISOString(),
          };
          
          const stats = getStatsForGameType(player, gameType);
          
          expect(stats.totalGames).toBe(0);
          expect(stats.winRate).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('getStatsForGameType winRate is always between 0 and 100', () => {
      fc.assert(
        fc.property(playerArbitrary, gameTypeArbitrary, (player, gameType) => {
          // **Validates: Requirements 2.3**
          const stats = getStatsForGameType(player, gameType);
          
          expect(stats.winRate).toBeGreaterThanOrEqual(0);
          expect(stats.winRate).toBeLessThanOrEqual(100);
        }),
        { numRuns: 100 }
      );
    });

    it('getStatsForGameType includes all required fields', () => {
      fc.assert(
        fc.property(playerArbitrary, gameTypeArbitrary, (player, gameType) => {
          // **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
          const stats = getStatsForGameType(player, gameType);
          
          expect(stats).toHaveProperty('wins');
          expect(stats).toHaveProperty('losses');
          expect(stats).toHaveProperty('streak');
          expect(stats).toHaveProperty('elo');
          expect(stats).toHaveProperty('totalGames');
          expect(stats).toHaveProperty('winRate');
          
          expect(typeof stats.wins).toBe('number');
          expect(typeof stats.losses).toBe('number');
          expect(typeof stats.streak).toBe('number');
          expect(typeof stats.elo).toBe('number');
          expect(typeof stats.totalGames).toBe('number');
          expect(typeof stats.winRate).toBe('number');
        }),
        { numRuns: 100 }
      );
    });
  });
});

describe('Error Handling', () => {
  describe('Invalid game type handling', () => {
    it('getPlayerStats defaults to singles for invalid game type', () => {
      const player: Player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        eloSingles: 1500,
        eloDoubles: 1300,
        winsSingles: 10,
        lossesSingles: 5,
        streakSingles: 3,
        winsDoubles: 8,
        lossesDoubles: 7,
        streakDoubles: -2,
        joinedAt: new Date().toISOString(),
      };

      // Mock console.warn to verify it's called
      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getPlayerStats(player, 'invalid' as GameType);

      // Should default to singles
      expect(stats.wins).toBe(player.winsSingles);
      expect(stats.losses).toBe(player.lossesSingles);
      expect(stats.streak).toBe(player.streakSingles);
      expect(stats.elo).toBe(player.eloSingles);

      // Should log a warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Invalid game type "invalid"')
      );

      console.warn = originalWarn;
    });

    it('getStatsForGameType defaults to singles for invalid game type', () => {
      const player: Player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        eloSingles: 1500,
        eloDoubles: 1300,
        winsSingles: 10,
        lossesSingles: 5,
        streakSingles: 3,
        winsDoubles: 8,
        lossesDoubles: 7,
        streakDoubles: -2,
        joinedAt: new Date().toISOString(),
      };

      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getStatsForGameType(player, 'invalid' as GameType);

      // Should default to singles
      expect(stats.wins).toBe(player.winsSingles);
      expect(stats.losses).toBe(player.lossesSingles);
      expect(stats.streak).toBe(player.streakSingles);
      expect(stats.elo).toBe(player.eloSingles);

      // Should log a warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Invalid game type "invalid"')
      );

      console.warn = originalWarn;
    });
  });

  describe('Missing properties handling', () => {
    it('getPlayerStats uses default values for missing singles properties', () => {
      const player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        joinedAt: new Date().toISOString(),
        // Missing all game-type-specific properties
      } as Player;

      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getPlayerStats(player, 'singles');

      // Should use default values
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.elo).toBe(1200);

      // Should log a warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('has missing game-type-specific properties')
      );

      console.warn = originalWarn;
    });

    it('getPlayerStats uses default values for missing doubles properties', () => {
      const player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        joinedAt: new Date().toISOString(),
        // Missing all game-type-specific properties
      } as Player;

      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getPlayerStats(player, 'doubles');

      // Should use default values
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.elo).toBe(1200);

      // Should log a warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('has missing game-type-specific properties')
      );

      console.warn = originalWarn;
    });

    it('getStatsForGameType calculates correctly with missing properties', () => {
      const player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        joinedAt: new Date().toISOString(),
        // Missing all game-type-specific properties
      } as Player;

      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getStatsForGameType(player, 'singles');

      // Should use default values and calculate correctly
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.elo).toBe(1200);
      expect(stats.totalGames).toBe(0);
      expect(stats.winRate).toBe(0);

      // Should log a warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('has missing game-type-specific properties')
      );

      console.warn = originalWarn;
    });

    it('getPlayerStats handles partially missing properties', () => {
      const player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        eloSingles: 1500,
        winsSingles: 10,
        // Missing lossesSingles, streakSingles, and all doubles properties
        joinedAt: new Date().toISOString(),
      } as Player;

      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getPlayerStats(player, 'singles');

      // Should use provided values and defaults for missing ones
      expect(stats.wins).toBe(10);
      expect(stats.losses).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.elo).toBe(1500);

      // Should log a warning
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('has missing game-type-specific properties')
      );

      console.warn = originalWarn;
    });
  });

  describe('Empty history handling', () => {
    it('getStatsForGameType handles player with no matches', () => {
      const player: Player = {
        id: 'test',
        name: 'New Player',
        avatar: 'avatar.png',
        eloSingles: 1200,
        eloDoubles: 1200,
        winsSingles: 0,
        lossesSingles: 0,
        streakSingles: 0,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
        joinedAt: new Date().toISOString(),
      };

      const stats = getStatsForGameType(player, 'singles');

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.totalGames).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.elo).toBe(1200);
    });

    it('getStatsForGameType handles player with only singles matches', () => {
      const player: Player = {
        id: 'test',
        name: 'Singles Player',
        avatar: 'avatar.png',
        eloSingles: 1400,
        eloDoubles: 1200,
        winsSingles: 15,
        lossesSingles: 5,
        streakSingles: 3,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
        joinedAt: new Date().toISOString(),
      };

      const singlesStats = getStatsForGameType(player, 'singles');
      expect(singlesStats.totalGames).toBe(20);
      expect(singlesStats.winRate).toBe(75);

      const doublesStats = getStatsForGameType(player, 'doubles');
      expect(doublesStats.totalGames).toBe(0);
      expect(doublesStats.winRate).toBe(0);
      expect(doublesStats.elo).toBe(1200);
    });

    it('getStatsForGameType handles player with only doubles matches', () => {
      const player: Player = {
        id: 'test',
        name: 'Doubles Player',
        avatar: 'avatar.png',
        eloSingles: 1200,
        eloDoubles: 1600,
        winsSingles: 0,
        lossesSingles: 0,
        streakSingles: 0,
        winsDoubles: 20,
        lossesDoubles: 10,
        streakDoubles: 5,
        joinedAt: new Date().toISOString(),
      };

      const singlesStats = getStatsForGameType(player, 'singles');
      expect(singlesStats.totalGames).toBe(0);
      expect(singlesStats.winRate).toBe(0);
      expect(singlesStats.elo).toBe(1200);

      const doublesStats = getStatsForGameType(player, 'doubles');
      expect(doublesStats.totalGames).toBe(30);
      expect(doublesStats.winRate).toBe(67);
    });
  });

  describe('Combined error scenarios', () => {
    it('handles invalid game type with missing properties', () => {
      const player = {
        id: 'test',
        name: 'Test Player',
        avatar: 'avatar.png',
        joinedAt: new Date().toISOString(),
      } as Player;

      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const stats = getPlayerStats(player, 'invalid' as GameType);

      // Should default to singles with default values
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.elo).toBe(1200);

      // Should log warnings for both issues
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('Invalid game type')
      );
      expect(warnMock).toHaveBeenCalledWith(
        expect.stringContaining('has missing game-type-specific properties')
      );

      console.warn = originalWarn;
    });
  });
});
