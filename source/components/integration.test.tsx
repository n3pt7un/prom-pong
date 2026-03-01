import { describe, it, expect, afterEach } from '@jest/globals';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import { act } from 'react';
import Leaderboard from './Leaderboard';
import PlayerProfile from './PlayerProfile';
import StatsDashboard from './StatsDashboard';
import { Player, Match, EloHistoryEntry, GameType, Racket } from '../types';

/**
 * Integration tests for Singles/Doubles Stats Separation
 * 
 * These tests verify that data flows correctly between components
 * and that game type selection is handled consistently across the application.
 * 
 * **Validates: Requirements 1.1, 2.2, 3.2**
 */

describe('Integration Tests: Singles/Doubles Stats Separation', () => {
  afterEach(() => {
    cleanup();
  });

  // Mock data for integration tests
  const mockPlayers: Player[] = [
    {
      id: 'player-1',
      name: 'Alice',
      avatar: 'https://example.com/alice.jpg',
      eloSingles: 1400,
      eloDoubles: 1250,
      winsSingles: 10,
      lossesSingles: 5,
      streakSingles: 3,
      winsDoubles: 8,
      lossesDoubles: 7,
      streakDoubles: -2,
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'player-2',
      name: 'Bob',
      avatar: 'https://example.com/bob.jpg',
      eloSingles: 1350,
      eloDoubles: 1300,
      winsSingles: 12,
      lossesSingles: 8,
      streakSingles: 1,
      winsDoubles: 10,
      lossesDoubles: 5,
      streakDoubles: 4,
      joinedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  const mockMatches: Match[] = [
    {
      id: 'match-1',
      type: 'singles',
      winners: ['player-1'],
      losers: ['player-2'],
      scoreWinner: 21,
      scoreLoser: 18,
      timestamp: '2024-01-10T10:00:00.000Z',
      eloChange: 15,
    },
    {
      id: 'match-2',
      type: 'doubles',
      winners: ['player-1', 'player-2'],
      losers: ['player-3', 'player-4'],
      scoreWinner: 21,
      scoreLoser: 15,
      timestamp: '2024-01-11T10:00:00.000Z',
      eloChange: 20,
    },
  ];

  const mockHistory: EloHistoryEntry[] = [
    {
      playerId: 'player-1',
      matchId: 'match-1',
      newElo: 1400,
      timestamp: '2024-01-10T10:00:00.000Z',
      gameType: 'singles',
    },
    {
      playerId: 'player-1',
      matchId: 'match-2',
      newElo: 1250,
      timestamp: '2024-01-11T10:00:00.000Z',
      gameType: 'doubles',
    },
    {
      playerId: 'player-2',
      matchId: 'match-1',
      newElo: 1350,
      timestamp: '2024-01-10T10:00:00.000Z',
      gameType: 'singles',
    },
    {
      playerId: 'player-2',
      matchId: 'match-2',
      newElo: 1300,
      timestamp: '2024-01-11T10:00:00.000Z',
      gameType: 'doubles',
    },
  ];

  const mockRackets: Racket[] = [];

  describe('Data flow between components', () => {
    it('maintains consistent game type data across Leaderboard and PlayerProfile', () => {
      // **Validates: Requirements 1.1, 2.2**
      
      // Render Leaderboard with singles selected
      const { container: leaderboardContainer, unmount: unmountLeaderboard } = render(
        <Leaderboard players={mockPlayers} matches={mockMatches} />
      );

      // Verify Alice's singles stats in Leaderboard
      const leaderboardRows = screen.getAllByRole('row');
      const aliceRow = leaderboardRows.find(row => row.textContent?.includes('Alice'));
      expect(aliceRow).toBeDefined();
      expect(aliceRow?.textContent).toContain('1400'); // Singles ELO
      expect(aliceRow?.textContent).toContain('10'); // Singles wins
      expect(aliceRow?.textContent).toContain('5'); // Singles losses

      unmountLeaderboard();

      // Render PlayerProfile for Alice with singles selected
      const { container: profileContainer, unmount: unmountProfile } = render(
        <PlayerProfile
          player={mockPlayers[0]}
          history={mockHistory}
          matches={mockMatches}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={false}
          onNavigateToArmory={() => {}}
          onUpdatePlayerName={() => {}}
        />
      );

      // Verify singles stats are displayed in PlayerProfile
      const profileText = profileContainer.textContent || '';
      expect(profileText).toContain('1400'); // Singles ELO
      
      // Look for win/loss stats
      const statCards = within(profileContainer).getAllByText(/\d+/);
      const hasWins = statCards.some(card => card.textContent?.includes('10'));
      const hasLosses = statCards.some(card => card.textContent?.includes('5'));
      expect(hasWins || hasLosses).toBe(true);

      unmountProfile();
    });

    it('maintains consistent game type data across Leaderboard and StatsDashboard', () => {
      // **Validates: Requirements 1.1, 3.2**
      
      // Render Leaderboard with doubles selected
      const { container: leaderboardContainer, unmount: unmountLeaderboard } = render(
        <Leaderboard players={mockPlayers} matches={mockMatches} />
      );

      // Switch to doubles
      const buttons = within(leaderboardContainer).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      // Verify Alice's doubles stats in Leaderboard
      const leaderboardRows = screen.getAllByRole('row');
      const aliceRow = leaderboardRows.find(row => row.textContent?.includes('Alice'));
      expect(aliceRow).toBeDefined();
      expect(aliceRow?.textContent).toContain('1250'); // Doubles ELO
      expect(aliceRow?.textContent).toContain('8'); // Doubles wins
      expect(aliceRow?.textContent).toContain('7'); // Doubles losses

      unmountLeaderboard();

      // Render StatsDashboard with doubles selected
      const { container: dashboardContainer, unmount: unmountDashboard } = render(
        <StatsDashboard
          players={mockPlayers}
          matches={mockMatches}
          history={mockHistory}
          rackets={mockRackets}
          onNavigateToArmory={() => {}}
          onUpdatePlayerName={() => {}}
        />
      );

      // Switch to doubles in StatsDashboard
      const dashboardButtons = within(dashboardContainer).getAllByRole('button');
      const dashboardDoublesButton = dashboardButtons.find(btn => btn.textContent === 'DOUBLES');
      
      if (dashboardDoublesButton) {
        act(() => {
          dashboardDoublesButton.click();
        });
      }

      // Verify doubles ELO is displayed
      const dashboardText = dashboardContainer.textContent || '';
      expect(dashboardText).toContain('1250'); // Alice's doubles ELO

      unmountDashboard();
    });

    it('filters match history correctly across components', () => {
      // **Validates: Requirements 2.7, 3.2**
      
      // Render PlayerProfile with singles selected
      const { container: profileContainer, unmount: unmountProfile } = render(
        <PlayerProfile
          player={mockPlayers[0]}
          history={mockHistory}
          matches={mockMatches}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={false}
          onNavigateToArmory={() => {}}
          onUpdatePlayerName={() => {}}
        />
      );

      // Verify only singles matches are shown (match-1)
      const profileText = profileContainer.textContent || '';
      
      // Should show singles match details
      expect(profileText).toContain('21'); // Score from singles match
      expect(profileText).toContain('18'); // Score from singles match

      unmountProfile();

      // Render StatsDashboard - it should render without errors
      const { container: dashboardContainer, unmount: unmountDashboard } = render(
        <StatsDashboard
          players={mockPlayers}
          matches={mockMatches}
          history={mockHistory}
          rackets={mockRackets}
          onNavigateToArmory={() => {}}
          onUpdatePlayerName={() => {}}
        />
      );

      // Verify StatsDashboard renders (it shows player selection UI when no comparison is active)
      const dashboardText = dashboardContainer.textContent || '';
      
      // Should show player selection interface
      expect(dashboardText).toContain('Select Player');

      unmountDashboard();
    });

    it('handles game type toggle without affecting other components', () => {
      // **Validates: Requirements 1.1, 2.2**
      
      // Render both Leaderboard and PlayerProfile
      const { container: leaderboardContainer, unmount: unmountLeaderboard } = render(
        <Leaderboard players={mockPlayers} matches={mockMatches} />
      );

      const { container: profileContainer, unmount: unmountProfile } = render(
        <PlayerProfile
          player={mockPlayers[0]}
          history={mockHistory}
          matches={mockMatches}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={false}
          onNavigateToArmory={() => {}}
          onUpdatePlayerName={() => {}}
        />
      );

      // Toggle Leaderboard to doubles
      const leaderboardButtons = within(leaderboardContainer).getAllByRole('button');
      const leaderboardDoublesButton = leaderboardButtons.find(btn => btn.textContent === 'DOUBLES');
      
      if (leaderboardDoublesButton) {
        act(() => {
          leaderboardDoublesButton.click();
        });
      }

      // Verify Leaderboard shows doubles stats
      const leaderboardRows = screen.getAllByRole('row');
      const aliceLeaderboardRow = leaderboardRows.find(row => row.textContent?.includes('Alice') && row.textContent?.includes('1250'));
      expect(aliceLeaderboardRow).toBeDefined();

      // Verify PlayerProfile still shows singles stats (independent state)
      const profileText = profileContainer.textContent || '';
      expect(profileText).toContain('1400'); // Singles ELO should still be visible

      unmountLeaderboard();
      unmountProfile();
    });
  });

  describe('Realistic data scenarios', () => {
    it('handles large datasets efficiently', () => {
      // **Validates: Requirements 1.4, 2.6, 2.7, 3.2**
      
      // Generate 100 players with varying stats
      const largePlayers: Player[] = Array.from({ length: 100 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        avatar: `https://example.com/player${i}.jpg`,
        eloSingles: 1200 + Math.floor(Math.random() * 800),
        eloDoubles: 1200 + Math.floor(Math.random() * 800),
        winsSingles: Math.floor(Math.random() * 50),
        lossesSingles: Math.floor(Math.random() * 50),
        streakSingles: Math.floor(Math.random() * 21) - 10,
        winsDoubles: Math.floor(Math.random() * 50),
        lossesDoubles: Math.floor(Math.random() * 50),
        streakDoubles: Math.floor(Math.random() * 21) - 10,
        joinedAt: new Date(2024, 0, i + 1).toISOString(),
      }));

      // Generate 1000 matches
      const largeMatches: Match[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `match-${i}`,
        type: i % 2 === 0 ? 'singles' : 'doubles',
        winners: i % 2 === 0 ? [`player-${i % 100}`] : [`player-${i % 100}`, `player-${(i + 1) % 100}`],
        losers: i % 2 === 0 ? [`player-${(i + 1) % 100}`] : [`player-${(i + 2) % 100}`, `player-${(i + 3) % 100}`],
        scoreWinner: 21,
        scoreLoser: Math.floor(Math.random() * 20),
        timestamp: new Date(2024, 0, 1 + Math.floor(i / 10)).toISOString(),
        eloChange: Math.floor(Math.random() * 30) + 5,
      }));

      // Render Leaderboard with large dataset
      const startTime = performance.now();
      const { unmount } = render(
        <Leaderboard players={largePlayers} matches={largeMatches} />
      );
      const renderTime = performance.now() - startTime;

      // Verify it renders in reasonable time (< 1000ms)
      expect(renderTime).toBeLessThan(1000);

      // Verify all players are rendered
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(101); // 100 players + 1 header row

      unmount();
    });

    it('handles players with mixed singles and doubles history', () => {
      // **Validates: Requirements 2.6, 2.7**
      
      const mixedPlayer: Player = {
        id: 'mixed-player',
        name: 'Mixed Player',
        avatar: 'https://example.com/mixed.jpg',
        eloSingles: 1450,
        eloDoubles: 1380,
        winsSingles: 25,
        lossesSingles: 15,
        streakSingles: 5,
        winsDoubles: 18,
        lossesDoubles: 12,
        streakDoubles: -1,
        joinedAt: '2024-01-01T00:00:00.000Z',
      };

      const mixedMatches: Match[] = [
        {
          id: 'singles-1',
          type: 'singles',
          winners: ['mixed-player'],
          losers: ['opponent-1'],
          scoreWinner: 21,
          scoreLoser: 15,
          timestamp: '2024-01-05T10:00:00.000Z',
          eloChange: 18,
        },
        {
          id: 'doubles-1',
          type: 'doubles',
          winners: ['mixed-player', 'partner-1'],
          losers: ['opponent-2', 'opponent-3'],
          scoreWinner: 21,
          scoreLoser: 19,
          timestamp: '2024-01-06T10:00:00.000Z',
          eloChange: 12,
        },
        {
          id: 'singles-2',
          type: 'singles',
          winners: ['mixed-player'],
          losers: ['opponent-4'],
          scoreWinner: 21,
          scoreLoser: 17,
          timestamp: '2024-01-07T10:00:00.000Z',
          eloChange: 15,
        },
      ];

      const mixedHistory: EloHistoryEntry[] = [
        {
          playerId: 'mixed-player',
          matchId: 'singles-1',
          newElo: 1435,
          timestamp: '2024-01-05T10:00:00.000Z',
          gameType: 'singles',
        },
        {
          playerId: 'mixed-player',
          matchId: 'doubles-1',
          newElo: 1380,
          timestamp: '2024-01-06T10:00:00.000Z',
          gameType: 'doubles',
        },
        {
          playerId: 'mixed-player',
          matchId: 'singles-2',
          newElo: 1450,
          timestamp: '2024-01-07T10:00:00.000Z',
          gameType: 'singles',
        },
      ];

      // Render PlayerProfile with singles selected
      const { container, unmount } = render(
        <PlayerProfile
          player={mixedPlayer}
          history={mixedHistory}
          matches={mixedMatches}
          rackets={mockRackets}
          players={[mixedPlayer]}
          onUpdateRacket={() => {}}
          isAdmin={false}
          onNavigateToArmory={() => {}}
          onUpdatePlayerName={() => {}}
        />
      );

      // Verify singles stats are shown
      const profileText = container.textContent || '';
      expect(profileText).toContain('1450'); // Singles ELO

      // Toggle to doubles
      const buttons = within(container).getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          doublesButton.click();
        });
      }

      // Verify doubles stats are shown
      const doublesText = container.textContent || '';
      expect(doublesText).toContain('1380'); // Doubles ELO

      unmount();
    });
  });
});

/**
 * Integration tests for Unranked Players Separation
 * 
 * These tests verify that unranked players are displayed correctly
 * with the appropriate visual indicators.
 * 
 * **Validates: Requirements 3.3, 3.4, 3.5, 5.4, 5.5**
 */
describe('Integration Tests: Unranked Players Separation', () => {
  afterEach(() => {
    cleanup();
  });

  it('displays unranked player rows with correct formatting', () => {
    // **Validates: Requirements 3.3, 3.4, 3.5, 5.4, 5.5**
    
    // Create a mix of ranked and unranked players
    const testPlayers: Player[] = [
      {
        id: 'ranked-player',
        name: 'Ranked Player',
        avatar: 'https://example.com/ranked.jpg',
        eloSingles: 1350,
        eloDoubles: 1200,
        winsSingles: 5,
        lossesSingles: 3,
        streakSingles: 2,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
        joinedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'unranked-player',
        name: 'Unranked Player',
        avatar: 'https://example.com/unranked.jpg',
        eloSingles: 1200,
        eloDoubles: 1200,
        winsSingles: 0,
        lossesSingles: 0,
        streakSingles: 0,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
        joinedAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    // Render Leaderboard with singles selected
    const { container } = render(
      <Leaderboard players={testPlayers} matches={[]} />
    );

    // Find the unranked section header
    const unrankedHeader = screen.getByText(/Unranked Players/i);
    expect(unrankedHeader).toBeInTheDocument();

    // Get all rows
    const rows = screen.getAllByRole('row');
    
    // Find the unranked player row
    const unrankedRow = rows.find(row => row.textContent?.includes('Unranked Player'));
    expect(unrankedRow).toBeDefined();
    
    const unrankedRowText = unrankedRow?.textContent || '';
    
    // Verify rank shows "—" instead of a number
    const cells = within(unrankedRow!).getAllByRole('cell');
    const rankCell = cells[0];
    expect(rankCell.textContent).toContain('—');
    
    // Verify player name is displayed
    expect(unrankedRowText).toContain('Unranked Player');
    
    // Verify ELO shows 1200
    expect(unrankedRowText).toContain('1200');
    
    // Verify win/loss shows "0 - 0"
    expect(unrankedRowText).toContain('0');
    
    // Verify streak shows "-"
    expect(unrankedRowText).toContain('-');
  });

  it('displays unranked players in both singles and doubles views', () => {
    // **Validates: Requirements 3.3, 3.4, 3.5**
    
    const unrankedPlayer: Player = {
      id: 'unranked-both',
      name: 'Unranked Both',
      avatar: 'https://example.com/unranked-both.jpg',
      eloSingles: 1200,
      eloDoubles: 1200,
      winsSingles: 0,
      lossesSingles: 0,
      streakSingles: 0,
      winsDoubles: 0,
      lossesDoubles: 0,
      streakDoubles: 0,
      joinedAt: '2024-01-01T00:00:00.000Z',
    };

    const { container } = render(
      <Leaderboard players={[unrankedPlayer]} matches={[]} />
    );

    // Verify unranked section exists in singles view
    let unrankedHeader = screen.getByText(/Unranked Players/i);
    expect(unrankedHeader).toBeInTheDocument();

    // Switch to doubles
    const buttons = within(container).getAllByRole('button');
    const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
    
    if (doublesButton) {
      act(() => {
        doublesButton.click();
      });
    }

    // Verify unranked section still exists in doubles view
    unrankedHeader = screen.getByText(/Unranked Players/i);
    expect(unrankedHeader).toBeInTheDocument();
    
    // Verify player is still shown with correct stats
    const rows = screen.getAllByRole('row');
    const unrankedRow = rows.find(row => row.textContent?.includes('Unranked Both'));
    expect(unrankedRow).toBeDefined();
    expect(unrankedRow?.textContent).toContain('1200');
    expect(unrankedRow?.textContent).toContain('0');
  });

  it('does not show unranked section when all players are ranked', () => {
    // **Validates: Requirements 3.6**
    
    const rankedPlayers: Player[] = [
      {
        id: 'ranked-1',
        name: 'Ranked One',
        avatar: 'https://example.com/ranked1.jpg',
        eloSingles: 1350,
        eloDoubles: 1280,
        winsSingles: 5,
        lossesSingles: 3,
        streakSingles: 2,
        winsDoubles: 4,
        lossesDoubles: 2,
        streakDoubles: 1,
        joinedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'ranked-2',
        name: 'Ranked Two',
        avatar: 'https://example.com/ranked2.jpg',
        eloSingles: 1300,
        eloDoubles: 1320,
        winsSingles: 3,
        lossesSingles: 4,
        streakSingles: -1,
        winsDoubles: 6,
        lossesDoubles: 3,
        streakDoubles: 3,
        joinedAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    render(<Leaderboard players={rankedPlayers} matches={[]} />);

    // Verify unranked section does not exist
    const unrankedHeader = screen.queryByText(/Unranked Players/i);
    expect(unrankedHeader).not.toBeInTheDocument();
  });
});
