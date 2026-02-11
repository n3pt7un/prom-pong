import { describe, it, expect, afterEach } from '@jest/globals';
import { render, screen, within, cleanup } from '@testing-library/react';
import { act } from 'react';
import * as fc from 'fast-check';
import PlayerProfile from './PlayerProfile';
import { Player, GameType, Match, EloHistoryEntry, Racket } from '../types';

/**
 * Arbitrary generator for Player objects with random stats
 */
const playerArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
  avatar: fc.webUrl(),
  eloSingles: fc.integer({ min: 800, max: 3000 }),
  eloDoubles: fc.integer({ min: 800, max: 3000 }),
  winsSingles: fc.integer({ min: 0, max: 100 }),
  lossesSingles: fc.integer({ min: 0, max: 100 }),
  streakSingles: fc.integer({ min: -20, max: 20 }),
  winsDoubles: fc.integer({ min: 0, max: 100 }),
  lossesDoubles: fc.integer({ min: 0, max: 100 }),
  streakDoubles: fc.integer({ min: -20, max: 20 }),
  joinedAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
}) as fc.Arbitrary<Player>;

/**
 * Arbitrary generator for GameType
 */
const gameTypeArbitrary: fc.Arbitrary<GameType> = fc.constantFrom('singles', 'doubles');

describe('PlayerProfile Component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Property 4: PlayerProfile toggle updates all statistics', () => {
    it('displays singles statistics when singles is selected', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          (player) => {
            // **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
            const { unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Calculate expected values for singles
            const totalGames = player.winsSingles + player.lossesSingles;
            const winRate = totalGames > 0 ? Math.round((player.winsSingles / totalGames) * 100) : 0;
            const absStreak = Math.abs(player.streakSingles);

            // Verify singles ELO is displayed
            const singlesEloElements = screen.getAllByText(player.eloSingles.toString());
            expect(singlesEloElements.length).toBeGreaterThan(0);

            // Verify total games is displayed
            if (totalGames > 0) {
              expect(screen.getByText(totalGames.toString())).toBeInTheDocument();
            }

            // Verify win rate is displayed
            const winRateElements = screen.getAllByText(`${winRate}%`);
            expect(winRateElements.length).toBeGreaterThan(0);

            // Verify W-L record is displayed
            expect(screen.getByText(`${player.winsSingles}W - ${player.lossesSingles}L`)).toBeInTheDocument();

            // Verify streak is displayed (if non-zero)
            if (player.streakSingles !== 0) {
              expect(screen.getByText(absStreak.toString())).toBeInTheDocument();
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays doubles statistics when doubles is toggled', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          (player) => {
            // **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Click the doubles button to switch to doubles view
            const buttons = within(container).getAllByRole('button');
            const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
            
            if (doublesButton) {
              act(() => {
                doublesButton.click();
              });
            }

            // Calculate expected values for doubles
            const totalGames = player.winsDoubles + player.lossesDoubles;
            const winRate = totalGames > 0 ? Math.round((player.winsDoubles / totalGames) * 100) : 0;
            const absStreak = Math.abs(player.streakDoubles);

            // Verify doubles ELO is displayed
            const doublesEloElements = screen.getAllByText(player.eloDoubles.toString());
            expect(doublesEloElements.length).toBeGreaterThan(0);

            // Verify total games is displayed
            if (totalGames > 0) {
              expect(screen.getByText(totalGames.toString())).toBeInTheDocument();
            }

            // Verify win rate is displayed
            const winRateElements = screen.getAllByText(`${winRate}%`);
            expect(winRateElements.length).toBeGreaterThan(0);

            // Verify W-L record is displayed (use getAllByText since it may appear in multiple places)
            const wlElements = screen.getAllByText(`${player.winsDoubles}W - ${player.lossesDoubles}L`);
            expect(wlElements.length).toBeGreaterThan(0);

            // Verify streak is displayed (if non-zero)
            if (player.streakDoubles !== 0) {
              expect(screen.getByText(absStreak.toString())).toBeInTheDocument();
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('updates all statistics when toggling between singles and doubles', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          gameTypeArbitrary,
          (player, initialGameType) => {
            // **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
            // Ensure singles and doubles stats are different to verify toggle works
            fc.pre(
              player.winsSingles !== player.winsDoubles ||
              player.lossesSingles !== player.lossesDoubles ||
              player.streakSingles !== player.streakDoubles ||
              player.eloSingles !== player.eloDoubles
            );

            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // If initial game type is doubles, click the doubles button first
            if (initialGameType === 'doubles') {
              const buttons = within(container).getAllByRole('button');
              const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
              
              if (doublesButton) {
                act(() => {
                  doublesButton.click();
                });
              }
            }

            // Verify initial game type stats are displayed
            const initialWins = initialGameType === 'singles' ? player.winsSingles : player.winsDoubles;
            const initialLosses = initialGameType === 'singles' ? player.lossesSingles : player.lossesDoubles;
            const initialTotalGames = initialWins + initialLosses;
            const initialWinRate = initialTotalGames > 0 ? Math.round((initialWins / initialTotalGames) * 100) : 0;

            expect(screen.getByText(`${initialWinRate}%`)).toBeInTheDocument();
            expect(screen.getByText(`${initialWins}W - ${initialLosses}L`)).toBeInTheDocument();

            // Toggle to the opposite game type
            const buttons = within(container).getAllByRole('button');
            const toggleButton = buttons.find(btn => 
              btn.textContent === (initialGameType === 'singles' ? 'DOUBLES' : 'SINGLES')
            );
            
            if (toggleButton) {
              act(() => {
                toggleButton.click();
              });
            }

            // Verify toggled game type stats are now displayed
            const toggledGameType = initialGameType === 'singles' ? 'doubles' : 'singles';
            const toggledWins = toggledGameType === 'singles' ? player.winsSingles : player.winsDoubles;
            const toggledLosses = toggledGameType === 'singles' ? player.lossesSingles : player.lossesDoubles;
            const toggledTotalGames = toggledWins + toggledLosses;
            const toggledWinRate = toggledTotalGames > 0 ? Math.round((toggledWins / toggledTotalGames) * 100) : 0;

            expect(screen.getByText(`${toggledWinRate}%`)).toBeInTheDocument();
            expect(screen.getByText(`${toggledWins}W - ${toggledLosses}L`)).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays correct statistics for any game type', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          gameTypeArbitrary,
          (player, gameType) => {
            // **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
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

            // Calculate expected values for the selected game type
            const wins = gameType === 'singles' ? player.winsSingles : player.winsDoubles;
            const losses = gameType === 'singles' ? player.lossesSingles : player.lossesDoubles;
            const streak = gameType === 'singles' ? player.streakSingles : player.streakDoubles;
            const elo = gameType === 'singles' ? player.eloSingles : player.eloDoubles;
            
            const totalGames = wins + losses;
            const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
            const absStreak = Math.abs(streak);

            // Verify all stats match the selected game type
            const eloElements = screen.getAllByText(elo.toString());
            expect(eloElements.length).toBeGreaterThan(0);

            const winRateElements = screen.getAllByText(`${winRate}%`);
            expect(winRateElements.length).toBeGreaterThan(0);
            expect(screen.getByText(`${wins}W - ${losses}L`)).toBeInTheDocument();

            if (totalGames > 0) {
              expect(screen.getByText(totalGames.toString())).toBeInTheDocument();
            }

            if (streak !== 0) {
              expect(screen.getByText(absStreak.toString())).toBeInTheDocument();
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
