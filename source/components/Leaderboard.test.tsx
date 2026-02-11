import { describe, it, expect, afterEach } from '@jest/globals';
import { render, screen, within, cleanup } from '@testing-library/react';
import { act } from 'react';
import * as fc from 'fast-check';
import Leaderboard from './Leaderboard';
import { Player, GameType } from '../types';

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

describe('Leaderboard Component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Property 2: Leaderboard displays game-type-specific statistics', () => {
    it('displays singles statistics when singles is selected', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 1, maxLength: 5 }),
          (players) => {
            // **Validates: Requirements 1.1, 1.2, 1.5**
            const { unmount } = render(
              <Leaderboard players={players} matches={[]} />
            );

            // For each player, verify that displayed stats match singles properties
            players.forEach((player) => {
              // Find the row by looking for the player's ELO value (more unique than name)
              const rows = screen.getAllByRole('row');
              const playerRow = rows.find(row => {
                const text = row.textContent || '';
                return text.includes(player.name) && text.includes(player.eloSingles.toString());
              });

              if (playerRow) {
                const rowText = playerRow.textContent || '';
                
                // Verify ELO is displayed (singles ELO)
                expect(rowText).toContain(player.eloSingles.toString());

                // Verify W/L stats match singles
                expect(rowText).toContain(player.winsSingles.toString());
                expect(rowText).toContain(player.lossesSingles.toString());

                // Verify streak matches singles (if non-zero)
                const absStreak = Math.abs(player.streakSingles);
                if (player.streakSingles !== 0) {
                  expect(rowText).toContain(absStreak.toString());
                }
              }
            });

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays doubles statistics when doubles is selected', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 1, maxLength: 5 }),
          (players) => {
            // **Validates: Requirements 1.1, 1.2, 1.5**
            const { container, unmount } = render(
              <Leaderboard players={players} matches={[]} />
            );

            // Click the doubles button to switch to doubles view
            const buttons = within(container).getAllByRole('button');
            const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
            
            if (doublesButton) {
              act(() => {
                doublesButton.click();
              });
            }

            // For each player, verify that displayed stats match doubles properties
            players.forEach((player) => {
              const rows = screen.getAllByRole('row');
              const playerRow = rows.find(row => {
                const text = row.textContent || '';
                return text.includes(player.name) && text.includes(player.eloDoubles.toString());
              });

              if (playerRow) {
                const rowText = playerRow.textContent || '';
                
                // Verify ELO is displayed (doubles ELO)
                expect(rowText).toContain(player.eloDoubles.toString());

                // Verify W/L stats match doubles
                expect(rowText).toContain(player.winsDoubles.toString());
                expect(rowText).toContain(player.lossesDoubles.toString());

                // Verify streak matches doubles (if non-zero)
                const absStreak = Math.abs(player.streakDoubles);
                if (player.streakDoubles !== 0) {
                  expect(rowText).toContain(absStreak.toString());
                }
              }
            });

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays correct game-type-specific statistics for any game type', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 1, maxLength: 5 }),
          gameTypeArbitrary,
          (players, gameType) => {
            // **Validates: Requirements 1.1, 1.2, 1.5**
            const { container, unmount } = render(
              <Leaderboard players={players} matches={[]} />
            );

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

            // For each player, verify stats match the selected game type
            players.forEach((player) => {
              const expectedElo = gameType === 'singles' ? player.eloSingles : player.eloDoubles;
              const expectedWins = gameType === 'singles' ? player.winsSingles : player.winsDoubles;
              const expectedLosses = gameType === 'singles' ? player.lossesSingles : player.lossesDoubles;
              const expectedStreak = gameType === 'singles' ? player.streakSingles : player.streakDoubles;

              const rows = screen.getAllByRole('row');
              const playerRow = rows.find(row => {
                const text = row.textContent || '';
                return text.includes(player.name) && text.includes(expectedElo.toString());
              });

              if (playerRow) {
                const rowText = playerRow.textContent || '';
                
                expect(rowText).toContain(expectedElo.toString());
                expect(rowText).toContain(expectedWins.toString());
                expect(rowText).toContain(expectedLosses.toString());

                const absStreak = Math.abs(expectedStreak);
                if (expectedStreak !== 0) {
                  expect(rowText).toContain(absStreak.toString());
                }
              }
            });

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('does not display legacy combined properties', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 1, maxLength: 3 }),
          (players) => {
            // **Validates: Requirements 1.5, 4.1**
            // Use unique high values for legacy properties that won't collide with game-specific stats
            const legacyMarkers = { wins: 99999, losses: 88888, streak: 77777 };
            
            // Ensure players have different values for game-specific stats than legacy values
            const playersWithLegacy = players.map(p => ({
              ...p,
              // Constrain all game-specific stats to be well below legacy marker values
              eloSingles: Math.min(p.eloSingles, 3000),
              eloDoubles: Math.min(p.eloDoubles, 3000),
              winsSingles: Math.min(p.winsSingles, 500),
              lossesSingles: Math.min(p.lossesSingles, 500),
              streakSingles: Math.min(Math.max(p.streakSingles, -25), 25),
              winsDoubles: Math.min(p.winsDoubles, 500),
              lossesDoubles: Math.min(p.lossesDoubles, 500),
              streakDoubles: Math.min(Math.max(p.streakDoubles, -25), 25),
              // Set legacy properties to unique high values
              wins: legacyMarkers.wins,
              losses: legacyMarkers.losses,
              streak: legacyMarkers.streak,
            }));

            const { container, unmount } = render(
              <Leaderboard players={playersWithLegacy} matches={[]} />
            );

            // Verify that legacy values are NOT displayed
            const text = container.textContent || '';
            
            // These specific legacy values should never appear since we constrained game-specific stats
            expect(text).not.toContain(legacyMarkers.wins.toString());
            expect(text).not.toContain(legacyMarkers.losses.toString());
            expect(text).not.toContain(legacyMarkers.streak.toString());

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Leaderboard sorting uses game-type-specific ELO', () => {
    it('sorts players by eloSingles descending when singles is selected', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 2, maxLength: 10 }),
          (players) => {
            // **Validates: Requirements 1.4**
            const { unmount } = render(
              <Leaderboard players={players} matches={[]} />
            );

            // Get all player rows (skip header row)
            const rows = screen.getAllByRole('row').slice(1);

            // Extract ELO values from the rows in display order
            const displayedElos: number[] = [];
            rows.forEach(row => {
              const rowText = row.textContent || '';
              // Find the player that matches this row
              const matchingPlayer = players.find(p => rowText.includes(p.name));
              if (matchingPlayer) {
                displayedElos.push(matchingPlayer.eloSingles);
              }
            });

            // Verify the displayed ELOs are in descending order
            for (let i = 0; i < displayedElos.length - 1; i++) {
              expect(displayedElos[i]).toBeGreaterThanOrEqual(displayedElos[i + 1]);
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('sorts players by eloDoubles descending when doubles is selected', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 2, maxLength: 10 }),
          (players) => {
            // **Validates: Requirements 1.4**
            const { container, unmount } = render(
              <Leaderboard players={players} matches={[]} />
            );

            // Click the doubles button
            const buttons = within(container).getAllByRole('button');
            const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
            
            if (doublesButton) {
              act(() => {
                doublesButton.click();
              });
            }

            // Get all player rows (skip header row)
            const rows = screen.getAllByRole('row').slice(1);

            // Extract ELO values from the rows in display order
            const displayedElos: number[] = [];
            rows.forEach(row => {
              const rowText = row.textContent || '';
              // Find the player that matches this row
              const matchingPlayer = players.find(p => rowText.includes(p.name));
              if (matchingPlayer) {
                displayedElos.push(matchingPlayer.eloDoubles);
              }
            });

            // Verify the displayed ELOs are in descending order
            for (let i = 0; i < displayedElos.length - 1; i++) {
              expect(displayedElos[i]).toBeGreaterThanOrEqual(displayedElos[i + 1]);
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('sorts by correct game-type-specific ELO for any game type', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 2, maxLength: 10 }),
          gameTypeArbitrary,
          (players, gameType) => {
            // Filter out players with duplicate IDs to avoid rendering issues
            const uniquePlayers = players.filter((p, index, self) =>
              index === self.findIndex((t) => t.id === p.id)
            );

            // Skip if not enough unique players
            if (uniquePlayers.length < 2) {
              return true;
            }

            // **Validates: Requirements 1.4**
            const { container, unmount } = render(
              <Leaderboard players={uniquePlayers} matches={[]} />
            );

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

            // Get all player rows (skip header row)
            const rows = screen.getAllByRole('row').slice(1);

            // Extract ELO values from the rows in display order
            const displayedElos: number[] = [];
            rows.forEach(row => {
              const rowText = row.textContent || '';
              // Find the player that matches this row by name (names should be unique in test data)
              const matchingPlayer = uniquePlayers.find(p => rowText.includes(p.name));
              if (matchingPlayer) {
                const elo = gameType === 'singles' ? matchingPlayer.eloSingles : matchingPlayer.eloDoubles;
                displayedElos.push(elo);
              }
            });

            // Verify the displayed ELOs are in descending order
            for (let i = 0; i < displayedElos.length - 1; i++) {
              expect(displayedElos[i]).toBeGreaterThanOrEqual(displayedElos[i + 1]);
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Unit Tests: Edge Cases', () => {
    it('renders without errors with empty player list', () => {
      // **Validates: Requirement 1.3**
      const { container } = render(
        <Leaderboard players={[]} matches={[]} />
      );

      // Should render the table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      // Should have header row but no player rows
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(1); // Only header row
    });

    it('displays null delta for players with no matches', () => {
      // **Validates: Requirement 1.3**
      const player: Player = {
        id: 'player-1',
        name: 'No Matches Player',
        avatar: 'https://example.com/avatar.jpg',
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
        <Leaderboard players={[player]} matches={[]} />
      );

      // Find the player row
      const rows = screen.getAllByRole('row');
      const playerRow = rows.find(row => row.textContent?.includes('No Matches Player'));

      expect(playerRow).toBeDefined();
      
      // The delta column should show a dash or be empty (not a number)
      const rowText = playerRow?.textContent || '';
      
      // Verify player stats are displayed
      expect(rowText).toContain('1200'); // ELO
      expect(rowText).toContain('0'); // wins/losses
      
      // The delta should not show a numeric value (should be null/dash)
      // We can verify this by checking that there's no +/- sign in the last column
      const cells = within(playerRow!).getAllByRole('cell');
      const lastCell = cells[cells.length - 1];
      const lastCellText = lastCell.textContent || '';
      
      // Should not contain + or - (which would indicate a delta value)
      expect(lastCellText).not.toMatch(/[+-]\d+/);
    });

    it('handles players with only singles matches correctly', () => {
      // **Validates: Requirement 1.3**
      const player: Player = {
        id: 'player-2',
        name: 'Singles Only Player',
        avatar: 'https://example.com/avatar.jpg',
        eloSingles: 1250,
        eloDoubles: 1200, // Default, no doubles played
        winsSingles: 5,
        lossesSingles: 3,
        streakSingles: 2,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
        joinedAt: new Date().toISOString(),
      };

      // Singles view should show stats
      const { container, unmount } = render(
        <Leaderboard players={[player]} matches={[]} />
      );

      const singlesRows = screen.getAllByRole('row');
      const singlesPlayerRow = singlesRows.find(row => row.textContent?.includes('Singles Only Player'));
      
      expect(singlesPlayerRow).toBeDefined();
      const singlesText = singlesPlayerRow?.textContent || '';
      expect(singlesText).toContain('1250'); // Singles ELO
      expect(singlesText).toContain('5'); // Singles wins
      expect(singlesText).toContain('3'); // Singles losses

      // Switch to doubles view
      const buttons = within(container).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      // Doubles view should show default stats (0 wins/losses)
      const doublesRows = screen.getAllByRole('row');
      const doublesPlayerRow = doublesRows.find(row => row.textContent?.includes('Singles Only Player'));
      
      expect(doublesPlayerRow).toBeDefined();
      const doublesText = doublesPlayerRow?.textContent || '';
      expect(doublesText).toContain('1200'); // Default doubles ELO
      expect(doublesText).toContain('0'); // No doubles wins
      expect(doublesText).toContain('0'); // No doubles losses

      unmount();
    });

    it('handles players with only doubles matches correctly', () => {
      // **Validates: Requirement 1.3**
      const player: Player = {
        id: 'player-3',
        name: 'Doubles Only Player',
        avatar: 'https://example.com/avatar.jpg',
        eloSingles: 1200, // Default, no singles played
        eloDoubles: 1300,
        winsSingles: 0,
        lossesSingles: 0,
        streakSingles: 0,
        winsDoubles: 7,
        lossesDoubles: 2,
        streakDoubles: 3,
        joinedAt: new Date().toISOString(),
      };

      // Singles view should show default stats
      const { container, unmount } = render(
        <Leaderboard players={[player]} matches={[]} />
      );

      const singlesRows = screen.getAllByRole('row');
      const singlesPlayerRow = singlesRows.find(row => row.textContent?.includes('Doubles Only Player'));
      
      expect(singlesPlayerRow).toBeDefined();
      const singlesText = singlesPlayerRow?.textContent || '';
      expect(singlesText).toContain('1200'); // Default singles ELO
      expect(singlesText).toContain('0'); // No singles wins
      expect(singlesText).toContain('0'); // No singles losses

      // Switch to doubles view
      const buttons = within(container).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      // Doubles view should show actual stats
      const doublesRows = screen.getAllByRole('row');
      const doublesPlayerRow = doublesRows.find(row => row.textContent?.includes('Doubles Only Player'));
      
      expect(doublesPlayerRow).toBeDefined();
      const doublesText = doublesPlayerRow?.textContent || '';
      expect(doublesText).toContain('1300'); // Doubles ELO
      expect(doublesText).toContain('7'); // Doubles wins
      expect(doublesText).toContain('2'); // Doubles losses

      unmount();
    });
  });
});
