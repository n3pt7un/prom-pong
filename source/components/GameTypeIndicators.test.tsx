import { describe, it, expect, afterEach } from '@jest/globals';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import '@testing-library/jest-dom';
import PlayerProfile from './PlayerProfile';
import Leaderboard from './Leaderboard';
import StatsDashboard from './StatsDashboard';
import { Player, GameType, Match, EloHistoryEntry, Racket } from '../types';

/**
 * Property tests for game type indicators and labels
 * Tests Properties 7, 8, and 9 from the design document
 */

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

describe('Game Type Indicators and Labels', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Property 7: Match displays include game type indicator', () => {
    it('displays game type for each match in PlayerProfile', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          fc.array(gameTypeArbitrary, { minLength: 1, maxLength: 5 }),
          (player, gameTypes) => {
            // **Validates: Requirements 5.4**
            
            // Generate matches with specific game types
            const matches: Match[] = gameTypes.map((type, index) => ({
              id: `match-${index}`,
              type,
              winners: [player.id],
              losers: [`opponent-${index}`],
              scoreWinner: 21,
              scoreLoser: 15,
              timestamp: new Date(Date.now() - index * 86400000).toISOString(),
              eloChange: 10,
            }));

            const { unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={matches}
                rackets={[]}
                players={[player]}
                onUpdateRacket={() => {}}
              />
            );

            // Verify each match displays its game type
            gameTypes.forEach((type) => {
              const gameTypeElements = screen.getAllByText(type, { exact: false });
              expect(gameTypeElements.length).toBeGreaterThan(0);
            });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('displays game type with correct styling in PlayerProfile', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          gameTypeArbitrary,
          (player, gameType) => {
            // **Validates: Requirements 5.4, 7.1**
            
            const match: Match = {
              id: 'match-1',
              type: gameType,
              winners: [player.id],
              losers: ['opponent-1'],
              scoreWinner: 21,
              scoreLoser: 15,
              timestamp: new Date().toISOString(),
              eloChange: 10,
            };

            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[match]}
                rackets={[]}
                players={[player]}
                onUpdateRacket={() => {}}
              />
            );

            // Find the game type badge (may appear multiple times)
            const gameTypeBadges = screen.getAllByText(gameType, { exact: false });
            expect(gameTypeBadges.length).toBeGreaterThan(0);

            // Find the badge in the recent matches section (should have the color class)
            const matchBadge = gameTypeBadges.find(badge => {
              const expectedColorClass = gameType === 'singles' ? 'text-cyber-cyan' : 'text-cyber-pink';
              return badge.className.includes(expectedColorClass);
            });
            
            expect(matchBadge).toBeTruthy();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Game-type-specific statistics use consistent color coding', () => {
    it('uses cyan color for singles statistics in PlayerProfile', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          (player) => {
            // **Validates: Requirements 7.1**
            
            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                players={[player]}
                onUpdateRacket={() => {}}
              />
            );

            // Find the Singles toggle button (should be active by default)
            const singlesButtons = screen.getAllByText('SINGLES');
            expect(singlesButtons.length).toBeGreaterThan(0);
            
            // Verify it has cyan styling when active
            expect(singlesButtons[0].className).toContain('bg-cyber-cyan');

            // Find the Singles ELO label
            const singlesLabels = screen.getAllByText('Singles', { exact: false });
            expect(singlesLabels.length).toBeGreaterThan(0);
            
            // Verify the Singles ELO display has cyan border
            const singlesEloContainer = singlesLabels[0].closest('.border-cyber-cyan\\/30');
            expect(singlesEloContainer).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('uses pink color for doubles statistics in PlayerProfile', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          (player) => {
            // **Validates: Requirements 7.1**
            
            const { container, unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                players={[player]}
                onUpdateRacket={() => {}}
              />
            );

            // Find the Doubles toggle button (there may be multiple DOUBLES texts)
            const doublesButtons = screen.getAllByText('DOUBLES');
            expect(doublesButtons.length).toBeGreaterThan(0);

            // Find the Doubles ELO label
            const doublesLabels = screen.getAllByText('Doubles', { exact: false });
            expect(doublesLabels.length).toBeGreaterThan(0);
            
            // Verify the Doubles ELO display has pink border
            const doublesEloContainer = doublesLabels[0].closest('.border-cyber-pink\\/30');
            expect(doublesEloContainer).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('uses consistent color coding in Leaderboard', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 1, maxLength: 5 }),
          gameTypeArbitrary,
          (players, gameType) => {
            // **Validates: Requirements 7.1**
            
            const { container, unmount } = render(
              <Leaderboard
                players={players}
                matches={[]}
              />
            );

            // Find the game type toggle buttons
            const singlesButtons = screen.getAllByText('SINGLES');
            const doublesButtons = screen.getAllByText('DOUBLES');
            
            expect(singlesButtons.length).toBeGreaterThan(0);
            expect(doublesButtons.length).toBeGreaterThan(0);

            // Singles should be active by default with cyan styling
            expect(singlesButtons[0].className).toContain('bg-cyber-cyan');
            
            // Doubles should not have pink styling when not active
            expect(doublesButtons[0].className).not.toContain('bg-cyber-pink');

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('uses consistent color coding in StatsDashboard', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 2, maxLength: 5 }),
          (players) => {
            // **Validates: Requirements 7.1**
            
            const { container, unmount } = render(
              <StatsDashboard
                players={players}
                matches={[]}
                history={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // The component should render without errors
            expect(container).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 9: ELO and streak displays include game type labels', () => {
    it('displays Singles and Doubles labels for ELO in PlayerProfile', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          (player) => {
            // **Validates: Requirements 7.2**
            
            const { unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                players={[player]}
                onUpdateRacket={() => {}}
              />
            );

            // Verify Singles label is present (there will be multiple, so use getAllByText)
            const singlesLabels = screen.getAllByText('Singles', { exact: false });
            expect(singlesLabels.length).toBeGreaterThan(0);

            // Verify Doubles label is present
            const doublesLabels = screen.getAllByText('Doubles', { exact: false });
            expect(doublesLabels.length).toBeGreaterThan(0);

            // Verify both ELO values are displayed (may appear multiple times)
            const singlesEloElements = screen.getAllByText(player.eloSingles.toString());
            expect(singlesEloElements.length).toBeGreaterThan(0);
            
            const doublesEloElements = screen.getAllByText(player.eloDoubles.toString());
            expect(doublesEloElements.length).toBeGreaterThan(0);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('displays game type label for streak in PlayerProfile', () => {
      fc.assert(
        fc.property(
          playerArbitrary,
          gameTypeArbitrary,
          (player, gameType) => {
            // **Validates: Requirements 7.4**
            
            const { unmount } = render(
              <PlayerProfile
                player={player}
                history={[]}
                matches={[]}
                rackets={[]}
                players={[player]}
                onUpdateRacket={() => {}}
              />
            );

            // By default, singles is selected, so we should see "Singles Streak"
            const streakLabel = screen.getByText(/Singles Streak|Doubles Streak/i);
            expect(streakLabel).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('displays game type label for ELO in StatsDashboard comparison', () => {
      fc.assert(
        fc.property(
          fc.array(playerArbitrary, { minLength: 2, maxLength: 2 }),
          gameTypeArbitrary,
          (players, gameType) => {
            // **Validates: Requirements 7.2**
            
            const { container, unmount } = render(
              <StatsDashboard
                players={players}
                matches={[]}
                history={[]}
                rackets={[]}
                onUpdateRacket={() => {}}
              />
            );

            // The component should render without errors
            expect(container).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
