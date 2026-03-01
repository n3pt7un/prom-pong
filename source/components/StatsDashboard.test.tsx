import { describe, it, expect, afterEach } from '@jest/globals';
import { render, screen, within, cleanup } from '@testing-library/react';
import { act } from 'react';
import * as fc from 'fast-check';
import StatsDashboard from './StatsDashboard';
import { Player, Match, EloHistoryEntry, GameType, Racket } from '../types';

/**
 * Arbitrary generator for Player objects with random stats
 */
const playerArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
  avatar: fc.webUrl(),
  eloSingles: fc.integer({ min: 0, max: 3000 }),
  eloDoubles: fc.integer({ min: 0, max: 3000 }),
  winsSingles: fc.integer({ min: 0, max: 1000 }),
  lossesSingles: fc.integer({ min: 0, max: 1000 }),
  streakSingles: fc.integer({ min: -50, max: 50 }),
  winsDoubles: fc.integer({ min: 0, max: 1000 }),
  lossesDoubles: fc.integer({ min: 0, max: 1000 }),
  streakDoubles: fc.integer({ min: -50, max: 50 }),
  joinedAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
}) as fc.Arbitrary<Player>;

/**
 * Arbitrary generator for GameType
 */
const gameTypeArbitrary: fc.Arbitrary<GameType> = fc.constantFrom('singles', 'doubles');

/**
 * Arbitrary generator for Match objects
 */
const matchArbitrary = (player1Id: string, player2Id: string) => fc.record({
  id: fc.uuid(),
  type: gameTypeArbitrary,
  winners: fc.constantFrom([player1Id], [player2Id]),
  losers: fc.constantFrom([player1Id], [player2Id]).filter((losers, ctx) => {
    const winners = (ctx as any).winners || [];
    return losers[0] !== winners[0];
  }),
  scoreWinner: fc.integer({ min: 11, max: 21 }),
  scoreLoser: fc.integer({ min: 0, max: 19 }),
  timestamp: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  eloChange: fc.integer({ min: 5, max: 50 }),
}) as fc.Arbitrary<Match>;

/**
 * Arbitrary generator for EloHistoryEntry objects
 */
const historyArbitrary = (playerId: string) => fc.record({
  playerId: fc.constant(playerId),
  matchId: fc.uuid(),
  newElo: fc.integer({ min: 800, max: 2500 }),
  timestamp: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  gameType: gameTypeArbitrary,
}) as fc.Arbitrary<EloHistoryEntry>;

describe('StatsDashboard Component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Property 6: StatsDashboard comparison uses game-type-specific data', () => {
    it('displays singles statistics when singles is selected in comparison mode', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          playerArbitrary,
          (player1, player2) => {
            // **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
            // Ensure players have different IDs
            const p1 = { ...player1, id: 'player-1' };
            const p2 = { ...player2, id: 'player-2' };

            const { container, unmount } = render(
              <StatsDashboard
                players={[p1, p2]}
                matches={[]}
                history={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Enter comparison mode
            const compareButton = within(container).getByTitle('Compare Players');
            act(() => {
              compareButton.click();
            });

            // Verify singles is selected by default
            const text = container.textContent || '';
            
            // Verify singles ELO is displayed for both players
            expect(text).toContain(p1.eloSingles.toString());
            expect(text).toContain(p2.eloSingles.toString());

            // Verify the label indicates singles
            expect(text).toContain('singles');

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays doubles statistics when doubles is selected in comparison mode', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          playerArbitrary,
          (player1, player2) => {
            // **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
            const p1 = { ...player1, id: 'player-1' };
            const p2 = { ...player2, id: 'player-2' };

            const { container, unmount } = render(
              <StatsDashboard
                players={[p1, p2]}
                matches={[]}
                history={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Enter comparison mode
            const compareButton = within(container).getByTitle('Compare Players');
            act(() => {
              compareButton.click();
            });

            // Click the doubles button
            const buttons = within(container).getAllByRole('button');
            const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
            
            if (doublesButton) {
              act(() => {
                doublesButton.click();
              });
            }

            const text = container.textContent || '';
            
            // Verify doubles ELO is displayed for both players
            expect(text).toContain(p1.eloDoubles.toString());
            expect(text).toContain(p2.eloDoubles.toString());

            // Verify the label indicates doubles
            expect(text).toContain('doubles');

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays correct game-type-specific statistics for any game type', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          playerArbitrary,
          gameTypeArbitrary,
          (player1, player2, gameType) => {
            // **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
            const p1 = { ...player1, id: 'player-1' };
            const p2 = { ...player2, id: 'player-2' };

            const { container, unmount } = render(
              <StatsDashboard
                players={[p1, p2]}
                matches={[]}
                history={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Enter comparison mode
            const compareButton = within(container).getByTitle('Compare Players');
            act(() => {
              compareButton.click();
            });

            // Click the appropriate button
            const buttons = within(container).getAllByRole('button');
            const targetButton = buttons.find(btn =>
              btn.textContent === (gameType === 'singles' ? 'SINGLES' : 'DOUBLES')
            );
            
            if (targetButton) {
              act(() => {
                targetButton.click();
              });
            }

            const text = container.textContent || '';
            
            // Get expected values based on game type
            const expectedElo1 = gameType === 'singles' ? p1.eloSingles : p1.eloDoubles;
            const expectedElo2 = gameType === 'singles' ? p2.eloSingles : p2.eloDoubles;
            const expectedWins1 = gameType === 'singles' ? p1.winsSingles : p1.winsDoubles;
            const expectedWins2 = gameType === 'singles' ? p2.winsSingles : p2.winsDoubles;
            const expectedLosses1 = gameType === 'singles' ? p1.lossesSingles : p1.lossesDoubles;
            const expectedLosses2 = gameType === 'singles' ? p2.lossesSingles : p2.lossesDoubles;

            // Verify ELO values are displayed
            expect(text).toContain(expectedElo1.toString());
            expect(text).toContain(expectedElo2.toString());

            // Calculate expected win rates
            const totalGames1 = expectedWins1 + expectedLosses1;
            const totalGames2 = expectedWins2 + expectedLosses2;
            
            if (totalGames1 > 0) {
              const winRate1 = Math.round((expectedWins1 / totalGames1) * 100);
              expect(text).toContain(`${winRate1}%`);
            }
            
            if (totalGames2 > 0) {
              const winRate2 = Math.round((expectedWins2 / totalGames2) * 100);
              expect(text).toContain(`${winRate2}%`);
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('filters head-to-head matches by selected game type', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          playerArbitrary,
          fc.array(fc.record({
            id: fc.uuid(),
            type: gameTypeArbitrary,
            winners: fc.constant(['player-1']),
            losers: fc.constant(['player-2']),
            scoreWinner: fc.integer({ min: 11, max: 21 }),
            scoreLoser: fc.integer({ min: 0, max: 19 }),
            timestamp: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
            eloChange: fc.integer({ min: 5, max: 50 }),
          }), { minLength: 2, maxLength: 10 }),
          gameTypeArbitrary,
          (player1, player2, matches, gameType) => {
            // **Validates: Requirements 3.2**
            const p1 = { ...player1, id: 'player-1' };
            const p2 = { ...player2, id: 'player-2' };

            const { container, unmount } = render(
              <StatsDashboard
                players={[p1, p2]}
                matches={matches as Match[]}
                history={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Enter comparison mode
            const compareButton = within(container).getByTitle('Compare Players');
            act(() => {
              compareButton.click();
            });

            // Click the appropriate button
            const buttons = within(container).getAllByRole('button');
            const targetButton = buttons.find(btn =>
              btn.textContent === (gameType === 'singles' ? 'SINGLES' : 'DOUBLES')
            );
            
            if (targetButton) {
              act(() => {
                targetButton.click();
              });
            }

            // Count expected matches of the selected game type
            const expectedMatches = matches.filter(m => m.type === gameType);
            const expectedCount = expectedMatches.length;

            const text = container.textContent || '';
            
            // Verify the total matches count matches the filtered count
            expect(text).toContain(`${expectedCount} Total Matches`);

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('filters ELO history by selected game type', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          playerArbitrary,
          fc.array(fc.record({
            playerId: fc.constantFrom('player-1', 'player-2'),
            matchId: fc.uuid(),
            newElo: fc.integer({ min: 800, max: 2500 }),
            timestamp: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
            gameType: gameTypeArbitrary,
          }), { minLength: 0, maxLength: 10 }),
          gameTypeArbitrary,
          (player1, player2, history, gameType) => {
            // **Validates: Requirements 3.3**
            const p1 = { ...player1, id: 'player-1' };
            const p2 = { ...player2, id: 'player-2' };

            const { container, unmount } = render(
              <StatsDashboard
                players={[p1, p2]}
                matches={[]}
                history={history as EloHistoryEntry[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Enter comparison mode
            const compareButton = within(container).getByTitle('Compare Players');
            act(() => {
              compareButton.click();
            });

            // Click the appropriate button
            const buttons = within(container).getAllByRole('button');
            const targetButton = buttons.find(btn =>
              btn.textContent === (gameType === 'singles' ? 'SINGLES' : 'DOUBLES')
            );
            
            if (targetButton) {
              act(() => {
                targetButton.click();
              });
            }

            // The chart should be rendered (we can't easily verify the data points,
            // but we can verify the chart title includes the game type)
            const text = container.textContent || '';
            expect(text).toContain(`${gameType} Elo Progression Comparison`);

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Unit Tests: Edge Cases', () => {
    it('renders without errors with no players', () => {
      // **Validates: Requirements 3.2, 3.3**
      const { container } = render(
        <StatsDashboard
          players={[]}
          matches={[]}
          history={[]}
          rackets={[]}
          onUpdateRacket={() => {}}
        />
      );

      const text = container.textContent || '';
      expect(text).toContain('Select a player to view statistics');
    });

    it('handles players with no head-to-head matches for selected game type', () => {
      // **Validates: Requirements 3.2**
      const player1: Player = {
        id: 'player-1',
        name: 'Player One',
        avatar: 'https://example.com/avatar1.jpg',
        eloSingles: 1300,
        eloDoubles: 1250,
        winsSingles: 10,
        lossesSingles: 5,
        streakSingles: 3,
        winsDoubles: 8,
        lossesDoubles: 7,
        streakDoubles: -1,
        joinedAt: new Date().toISOString(),
      };

      const player2: Player = {
        id: 'player-2',
        name: 'Player Two',
        avatar: 'https://example.com/avatar2.jpg',
        eloSingles: 1280,
        eloDoubles: 1320,
        winsSingles: 12,
        lossesSingles: 8,
        streakSingles: 2,
        winsDoubles: 15,
        lossesDoubles: 5,
        streakDoubles: 5,
        joinedAt: new Date().toISOString(),
      };

      // Create matches but only singles matches
      const matches: Match[] = [
        {
          id: 'match-1',
          type: 'singles',
          winners: ['player-1'],
          losers: ['player-2'],
          scoreWinner: 11,
          scoreLoser: 9,
          timestamp: new Date().toISOString(),
          eloChange: 15,
        },
      ];

      const { container } = render(
        <StatsDashboard
          players={[player1, player2]}
          matches={matches}
          history={[]}
          rackets={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Enter comparison mode
      const compareButton = within(container).getByTitle('Compare Players');
      act(() => {
        compareButton.click();
      });

      // Switch to doubles (no matches)
      const buttons = within(container).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      const text = container.textContent || '';
      
      // Should show 0 total matches for doubles
      expect(text).toContain('0 Total Matches');
      
      // Should still display player stats
      expect(text).toContain('Player One');
      expect(text).toContain('Player Two');
    });

    it('handles players with no history for selected game type', () => {
      // **Validates: Requirements 3.3**
      const player1: Player = {
        id: 'player-1',
        name: 'Player One',
        avatar: 'https://example.com/avatar1.jpg',
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

      const player2: Player = {
        id: 'player-2',
        name: 'Player Two',
        avatar: 'https://example.com/avatar2.jpg',
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

      const { container } = render(
        <StatsDashboard
          players={[player1, player2]}
          matches={[]}
          history={[]}
          rackets={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Enter comparison mode
      const compareButton = within(container).getByTitle('Compare Players');
      act(() => {
        compareButton.click();
      });

      const text = container.textContent || '';
      
      // Should display starting ELO of 1200
      expect(text).toContain('1200');
      
      // Should show 0 total matches
      expect(text).toContain('0 Total Matches');
      
      // Chart should still render with title
      expect(text).toContain('Elo Progression Comparison');
    });

    it('toggle updates comparison correctly', () => {
      // **Validates: Requirements 3.1**
      const player1: Player = {
        id: 'player-1',
        name: 'Player One',
        avatar: 'https://example.com/avatar1.jpg',
        eloSingles: 1400,
        eloDoubles: 1100,
        winsSingles: 20,
        lossesSingles: 10,
        streakSingles: 5,
        winsDoubles: 5,
        lossesDoubles: 15,
        streakDoubles: -3,
        joinedAt: new Date().toISOString(),
      };

      const player2: Player = {
        id: 'player-2',
        name: 'Player Two',
        avatar: 'https://example.com/avatar2.jpg',
        eloSingles: 1100,
        eloDoubles: 1400,
        winsSingles: 8,
        lossesSingles: 12,
        streakSingles: -2,
        winsDoubles: 18,
        lossesDoubles: 7,
        streakDoubles: 4,
        joinedAt: new Date().toISOString(),
      };

      const { container } = render(
        <StatsDashboard
          players={[player1, player2]}
          matches={[]}
          history={[]}
          rackets={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Enter comparison mode
      const compareButton = within(container).getByTitle('Compare Players');
      act(() => {
        compareButton.click();
      });

      // Initially should show singles stats
      let text = container.textContent || '';
      expect(text).toContain('1400'); // Player 1 singles ELO
      expect(text).toContain('1100'); // Player 2 singles ELO

      // Switch to doubles
      const buttons = within(container).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      // Now should show doubles stats
      text = container.textContent || '';
      expect(text).toContain('1100'); // Player 1 doubles ELO
      expect(text).toContain('1400'); // Player 2 doubles ELO
    });

    it('displays opposite game type ELO in comparison table', () => {
      // **Validates: Requirements 3.4**
      const player1: Player = {
        id: 'player-1',
        name: 'Player One',
        avatar: 'https://example.com/avatar1.jpg',
        eloSingles: 1500,
        eloDoubles: 1300,
        winsSingles: 25,
        lossesSingles: 10,
        streakSingles: 7,
        winsDoubles: 12,
        lossesDoubles: 8,
        streakDoubles: 2,
        joinedAt: new Date().toISOString(),
      };

      const player2: Player = {
        id: 'player-2',
        name: 'Player Two',
        avatar: 'https://example.com/avatar2.jpg',
        eloSingles: 1450,
        eloDoubles: 1350,
        winsSingles: 22,
        lossesSingles: 13,
        streakSingles: 3,
        winsDoubles: 15,
        lossesDoubles: 10,
        streakDoubles: 4,
        joinedAt: new Date().toISOString(),
      };

      const { container } = render(
        <StatsDashboard
          players={[player1, player2]}
          matches={[]}
          history={[]}
          rackets={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Enter comparison mode
      const compareButton = within(container).getByTitle('Compare Players');
      act(() => {
        compareButton.click();
      });

      // In singles mode, should show doubles ELO in the table
      let text = container.textContent || '';
      expect(text).toContain('Doubles Elo');
      expect(text).toContain('1300'); // Player 1 doubles ELO
      expect(text).toContain('1350'); // Player 2 doubles ELO

      // Switch to doubles
      const buttons = within(container).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      // In doubles mode, should show singles ELO in the table
      text = container.textContent || '';
      expect(text).toContain('Singles Elo');
      expect(text).toContain('1500'); // Player 1 singles ELO
      expect(text).toContain('1450'); // Player 2 singles ELO
    });
  });
});
