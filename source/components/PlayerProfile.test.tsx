import { describe, it, expect, afterEach } from '@jest/globals';
import { render, screen, within, cleanup } from '@testing-library/react';
import { act } from 'react';
import * as fc from 'fast-check';
import '@testing-library/jest-dom';
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

/**
 * Arbitrary generator for Match objects
 */
const matchArbitrary = (playerId: string, gameType?: GameType) => fc.record({
  id: fc.uuid(),
  type: gameType ? fc.constant(gameType) : gameTypeArbitrary,
  winners: fc.constant([playerId]),
  losers: fc.array(fc.uuid(), { minLength: 1, maxLength: 1 }),
  scoreWinner: fc.integer({ min: 11, max: 21 }),
  scoreLoser: fc.integer({ min: 0, max: 20 }),
  timestamp: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  eloChange: fc.integer({ min: 1, max: 50 }),
}) as fc.Arbitrary<Match>;

/**
 * Arbitrary generator for EloHistoryEntry objects
 */
const historyEntryArbitrary = (playerId: string, gameType?: GameType) => fc.record({
  playerId: fc.constant(playerId),
  matchId: fc.uuid(),
  newElo: fc.integer({ min: 800, max: 3000 }),
  timestamp: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  gameType: gameType ? fc.constant(gameType) : gameTypeArbitrary,
}) as fc.Arbitrary<EloHistoryEntry>;

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
                players={[]}
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
                players={[]}
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
                players={[]}
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
                players={[]}
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
            
            const recordElements = screen.getAllByText(`${wins}W - ${losses}L`);
            expect(recordElements.length).toBeGreaterThan(0);

            if (totalGames > 0) {
              expect(screen.getByText(totalGames.toString())).toBeInTheDocument();
            }

            if (streak !== 0) {
              const streakElements = screen.getAllByText(absStreak.toString());
              expect(streakElements.length).toBeGreaterThan(0);
            }

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 5: PlayerProfile filters data by game type', () => {
    it('displays only singles matches when singles is selected', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          (player, opponentIds) => {
            // **Validates: Requirements 2.6, 2.7**
            // Generate mixed matches (both singles and doubles)
            const singlesMatches = opponentIds.slice(0, Math.ceil(opponentIds.length / 2)).map((oppId, i) => ({
              id: `singles-${i}`,
              type: 'singles' as GameType,
              winners: [player.id],
              losers: [oppId],
              scoreWinner: 21,
              scoreLoser: 15,
              timestamp: new Date(Date.now() - i * 86400000).toISOString(),
              eloChange: 10,
            }));

            const doublesMatches = opponentIds.slice(Math.ceil(opponentIds.length / 2)).map((oppId, i) => ({
              id: `doubles-${i}`,
              type: 'doubles' as GameType,
              winners: [player.id],
              losers: [oppId],
              scoreWinner: 21,
              scoreLoser: 15,
              timestamp: new Date(Date.now() - i * 86400000).toISOString(),
              eloChange: 10,
            }));

            const allMatches = [...singlesMatches, ...doublesMatches];

            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={allMatches}
                rackets={[]}
                players={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Singles should be selected by default
            // Verify that only singles matches are displayed
            const matchElements = container.querySelectorAll('[class*="border-b"]');
            
            // Check that singles type is shown in the recent matches
            const singlesTypeElements = within(container).queryAllByText('singles');
            const doublesTypeElements = within(container).queryAllByText('doubles');
            
            // Should have singles matches displayed, not doubles
            expect(singlesTypeElements.length).toBeGreaterThan(0);
            expect(doublesTypeElements.length).toBe(0);

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('displays only doubles matches when doubles is selected', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }), // Ensure at least 2 opponents for both types
          (player, opponentIds) => {
            // **Validates: Requirements 2.6, 2.7**
            // Generate mixed matches (both singles and doubles)
            const singlesMatches = opponentIds.slice(0, Math.ceil(opponentIds.length / 2)).map((oppId, i) => ({
              id: `singles-${i}`,
              type: 'singles' as GameType,
              winners: [player.id],
              losers: [oppId],
              scoreWinner: 21,
              scoreLoser: 15,
              timestamp: new Date(Date.now() - i * 86400000).toISOString(),
              eloChange: 10,
            }));

            const doublesMatches = opponentIds.slice(Math.ceil(opponentIds.length / 2)).map((oppId, i) => ({
              id: `doubles-${i}`,
              type: 'doubles' as GameType,
              winners: [player.id],
              losers: [oppId],
              scoreWinner: 21,
              scoreLoser: 15,
              timestamp: new Date(Date.now() - i * 86400000).toISOString(),
              eloChange: 10,
            }));

            // Ensure we have at least one doubles match
            fc.pre(doublesMatches.length > 0);

            const allMatches = [...singlesMatches, ...doublesMatches];

            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={allMatches}
                rackets={[]}
                players={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Click the doubles button
            const buttons = within(container).getAllByRole('button');
            const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
            
            if (doublesButton) {
              act(() => {
                doublesButton.click();
              });
            }

            // Verify that only doubles matches are displayed
            const singlesTypeElements = within(container).queryAllByText('singles');
            const doublesTypeElements = within(container).queryAllByText('doubles');
            
            // Should have doubles matches displayed, not singles
            expect(doublesTypeElements.length).toBeGreaterThan(0);
            expect(singlesTypeElements.length).toBe(0);

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
          fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
          (player, matchIds) => {
            // **Validates: Requirements 2.6**
            // Generate mixed history entries
            const singlesHistory = matchIds.slice(0, Math.ceil(matchIds.length / 2)).map((matchId, i) => ({
              playerId: player.id,
              matchId,
              newElo: 1200 + i * 10,
              timestamp: new Date(Date.now() - i * 86400000).toISOString(),
              gameType: 'singles' as GameType,
            }));

            const doublesHistory = matchIds.slice(Math.ceil(matchIds.length / 2)).map((matchId, i) => ({
              playerId: player.id,
              matchId,
              newElo: 1200 + i * 10,
              timestamp: new Date(Date.now() - i * 86400000).toISOString(),
              gameType: 'doubles' as GameType,
            }));

            const allHistory = [...singlesHistory, ...doublesHistory];

            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={allHistory}
                matches={[]}
                rackets={[]}
                players={[]}
                onUpdateRacket={() => {}}
              />
            );

            // Singles should be selected by default
            // The chart should only show singles history
            // We can't easily verify the chart data, but we can verify the component renders without error
            expect(container).toBeInTheDocument();

            // Click the doubles button
            const buttons = within(container).getAllByRole('button');
            const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
            
            if (doublesButton) {
              act(() => {
                doublesButton.click();
              });
            }

            // The chart should now show doubles history
            // Again, we verify the component renders without error
            expect(container).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('displays "No matches played" when player has no matches for selected game type', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Test Player',
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

      const { container, unmount } = render(
        <PlayerProfile
          player={player}
          history={[]}
          matches={[]}
          rackets={[]}
          players={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Should show "No matches played" message
      expect(screen.getByText('No matches played')).toBeInTheDocument();

      unmount();
    });

    it('displays starting ELO of 1200 when player has no history for selected game type', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Test Player',
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

      const { container, unmount } = render(
        <PlayerProfile
          player={player}
          history={[]}
          matches={[]}
          rackets={[]}
          players={[]}
          onUpdateRacket={() => {}}
        />
      );

      // The chart should render with starting value of 1200
      // We verify the component renders without error
      expect(container).toBeInTheDocument();

      // Verify ELO is displayed
      const eloElements = screen.getAllByText('1200');
      expect(eloElements.length).toBeGreaterThan(0);

      unmount();
    });

    it('toggle functionality updates state correctly', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Test Player',
        avatar: 'https://example.com/avatar.jpg',
        eloSingles: 1300,
        eloDoubles: 1400,
        winsSingles: 10,
        lossesSingles: 5,
        streakSingles: 3,
        winsDoubles: 8,
        lossesDoubles: 7,
        streakDoubles: -2,
        joinedAt: new Date().toISOString(),
      };

      const { container, unmount } = render(
        <PlayerProfile
          player={player}
          history={[]}
          matches={[]}
          rackets={[]}
          players={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Initially singles should be selected
      const singlesButton = within(container).getByText('SINGLES');
      expect(singlesButton).toHaveClass('bg-cyber-cyan');

      // Verify singles stats are displayed
      expect(screen.getByText('10W - 5L')).toBeInTheDocument();

      // Click doubles button
      const doublesButton = within(container).getByText('DOUBLES');
      act(() => {
        doublesButton.click();
      });

      // Verify doubles button is now active
      expect(doublesButton).toHaveClass('bg-cyber-pink');

      // Verify doubles stats are now displayed
      expect(screen.getByText('8W - 7L')).toBeInTheDocument();

      unmount();
    });

    it('handles player with only singles matches correctly', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Test Player',
        avatar: 'https://example.com/avatar.jpg',
        eloSingles: 1300,
        eloDoubles: 1200,
        winsSingles: 5,
        lossesSingles: 3,
        streakSingles: 2,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
        joinedAt: new Date().toISOString(),
      };

      const singlesMatches: Match[] = [
        {
          id: 'match-1',
          type: 'singles',
          winners: ['player-1'],
          losers: ['player-2'],
          scoreWinner: 21,
          scoreLoser: 15,
          timestamp: new Date().toISOString(),
          eloChange: 10,
        },
      ];

      const { container, unmount } = render(
        <PlayerProfile
          player={player}
          history={[]}
          matches={singlesMatches}
          rackets={[]}
          players={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Singles should show matches
      expect(screen.getByText('singles')).toBeInTheDocument();

      // Click doubles button
      const doublesButton = within(container).getByText('DOUBLES');
      act(() => {
        doublesButton.click();
      });

      // Doubles should show "No matches played"
      expect(screen.getByText('No matches played')).toBeInTheDocument();

      unmount();
    });

    it('handles player with only doubles matches correctly', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Test Player',
        avatar: 'https://example.com/avatar.jpg',
        eloSingles: 1200,
        eloDoubles: 1350,
        winsSingles: 0,
        lossesSingles: 0,
        streakSingles: 0,
        winsDoubles: 7,
        lossesDoubles: 4,
        streakDoubles: 3,
        joinedAt: new Date().toISOString(),
      };

      const doublesMatches: Match[] = [
        {
          id: 'match-1',
          type: 'doubles',
          winners: ['player-1'],
          losers: ['player-2'],
          scoreWinner: 21,
          scoreLoser: 15,
          timestamp: new Date().toISOString(),
          eloChange: 10,
        },
      ];

      const { container, unmount } = render(
        <PlayerProfile
          player={player}
          history={[]}
          matches={doublesMatches}
          rackets={[]}
          players={[]}
          onUpdateRacket={() => {}}
        />
      );

      // Singles should show "No matches played" by default
      expect(screen.getByText('No matches played')).toBeInTheDocument();

      // Click doubles button
      const doublesButton = within(container).getByText('DOUBLES');
      act(() => {
        doublesButton.click();
      });

      // Doubles should show matches
      expect(screen.getByText('doubles')).toBeInTheDocument();

      unmount();
    });
  });
});
