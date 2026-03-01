import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import { act } from 'react';
import PlayerProfile from './PlayerProfile';
import { Player, Match, EloHistoryEntry, Racket } from '../types';

/**
 * Test suite for verifying existing PlayerProfile features still work
 * after advanced stats integration.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

describe('PlayerProfile - Existing Features Verification', () => {
  afterEach(() => {
    cleanup();
  });

  const mockPlayer: Player = {
    id: 'player-1',
    name: 'Test Player',
    avatar: 'https://example.com/avatar.jpg',
    eloSingles: 1500,
    eloDoubles: 1400,
    winsSingles: 10,
    lossesSingles: 5,
    streakSingles: 3,
    winsDoubles: 8,
    lossesDoubles: 7,
    streakDoubles: -2,
    joinedAt: new Date().toISOString(),
  };

  const mockRackets: Racket[] = [
    {
      id: 'racket-1',
      name: 'Thunder Strike',
      icon: 'zap',
      color: '#fcee0a',
      stats: { power: 8, control: 6, speed: 7 },
      ownerId: 'player-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'racket-2',
      name: 'Ice Blade',
      icon: 'snowflake',
      color: '#00f3ff',
      stats: { power: 5, control: 9, speed: 8 },
      ownerId: 'player-1',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockPlayers: Player[] = [mockPlayer];

  describe('Racket Selection Dropdown (Requirement 6.4)', () => {
    it('should display racket selection dropdown', () => {
      const onUpdateRacket = jest.fn();
      
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={onUpdateRacket}
        />
      );

      // Find the select element
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeTruthy();
    });

    it('should list all available rackets in dropdown', () => {
      const onUpdateRacket = jest.fn();
      
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={onUpdateRacket}
        />
      );

      const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(selectElement.options);
      
      // Should have "Equip..." option plus all rackets
      expect(options.length).toBe(mockRackets.length + 1);
      expect(options[0].textContent).toBe('Equip...');
      expect(options[1].textContent).toBe('Thunder Strike');
      expect(options[2].textContent).toBe('Ice Blade');
    });

    it('should call onUpdateRacket when a racket is selected', () => {
      const onUpdateRacket = jest.fn();
      
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={onUpdateRacket}
        />
      );

      const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
      
      act(() => {
        fireEvent.change(selectElement, { target: { value: 'racket-1' } });
      });

      expect(onUpdateRacket).toHaveBeenCalledWith('player-1', 'racket-1');
    });

    it('should display equipped racket information', () => {
      const playerWithRacket = { ...mockPlayer, mainRacketId: 'racket-1' };
      
      render(
        <PlayerProfile
          player={playerWithRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
        />
      );

      // Should display the racket name (use getAllByText since it appears in both display and dropdown)
      const racketNames = screen.getAllByText('Thunder Strike');
      expect(racketNames.length).toBeGreaterThan(0);
      
      // Should display the racket stats (sorted by value: Power 8 / Speed 7 / Control 6)
      expect(screen.getByText('Power 8 / Speed 7 / Control 6')).toBeTruthy();
    });
  });

  describe('Admin Name Editing (Requirement 6.3)', () => {
    it('should show edit button for admin users', () => {
      const onUpdatePlayerName = jest.fn();
      
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={true}
          onUpdatePlayerName={onUpdatePlayerName}
        />
      );

      // Find the edit button (Pencil icon button)
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.getAttribute('title') === 'Edit player name');
      
      expect(editButton).toBeTruthy();
    });

    it('should not show edit button for non-admin users', () => {
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.getAttribute('title') === 'Edit player name');
      
      expect(editButton).toBeFalsy();
    });

    it('should show input field when edit button is clicked', () => {
      const onUpdatePlayerName = jest.fn();
      
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={true}
          onUpdatePlayerName={onUpdatePlayerName}
        />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.getAttribute('title') === 'Edit player name');
      
      if (editButton) {
        act(() => {
          fireEvent.click(editButton);
        });

        // Should show input field with current name
        const input = screen.getByDisplayValue('Test Player');
        expect(input).toBeTruthy();
      }
    });

    it('should call onUpdatePlayerName when name is confirmed', () => {
      const onUpdatePlayerName = jest.fn();
      
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          isAdmin={true}
          onUpdatePlayerName={onUpdatePlayerName}
        />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.getAttribute('title') === 'Edit player name');
      
      if (editButton) {
        act(() => {
          fireEvent.click(editButton);
        });

        const input = screen.getByDisplayValue('Test Player') as HTMLInputElement;
        
        act(() => {
          fireEvent.change(input, { target: { value: 'New Player Name' } });
        });

        // Find and click the confirm button (Check icon)
        const confirmButtons = screen.getAllByRole('button');
        const confirmButton = confirmButtons.find(btn => {
          const svg = btn.querySelector('svg');
          return svg?.classList.contains('lucide-check');
        });
        
        if (confirmButton) {
          act(() => {
            fireEvent.click(confirmButton);
          });

          expect(onUpdatePlayerName).toHaveBeenCalledWith('player-1', 'New Player Name');
        }
      }
    });
  });

  describe('Game Type Toggle (Requirement 6.2)', () => {
    it('should display singles and doubles toggle buttons', () => {
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
        />
      );

      expect(screen.getByText('SINGLES')).toBeTruthy();
      expect(screen.getByText('DOUBLES')).toBeTruthy();
    });

    it('should toggle between singles and doubles when clicked', () => {
      render(
        <PlayerProfile
          player={mockPlayer}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
        />
      );

      const buttons = screen.getAllByRole('button');
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      
      if (doublesButton) {
        act(() => {
          fireEvent.click(doublesButton);
        });

        // Verify doubles stats are displayed
        expect(screen.getByText(`${mockPlayer.winsDoubles}W - ${mockPlayer.lossesDoubles}L`)).toBeTruthy();
      }
    });
  });

  describe('Navigation to Armory (Requirement 6.4)', () => {
    it('should display "Go to Armory" button when player has no racket', () => {
      const onNavigateToArmory = jest.fn();
      const playerWithoutRacket = { ...mockPlayer, mainRacketId: undefined };
      
      render(
        <PlayerProfile
          player={playerWithoutRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="player-1"
          onNavigateToArmory={onNavigateToArmory}
        />
      );

      const armoryButton = screen.getByText('Go to Armory');
      expect(armoryButton).toBeTruthy();
    });

    it('should call onNavigateToArmory when button is clicked', () => {
      const onNavigateToArmory = jest.fn();
      const playerWithoutRacket = { ...mockPlayer, mainRacketId: undefined };
      
      render(
        <PlayerProfile
          player={playerWithoutRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="player-1"
          onNavigateToArmory={onNavigateToArmory}
        />
      );

      const armoryButton = screen.getByText('Go to Armory');
      
      act(() => {
        fireEvent.click(armoryButton);
      });

      expect(onNavigateToArmory).toHaveBeenCalled();
    });

    it('should not display armory button when player has a racket', () => {
      const onNavigateToArmory = jest.fn();
      const playerWithRacket = { ...mockPlayer, mainRacketId: 'racket-1' };
      
      render(
        <PlayerProfile
          player={playerWithRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="player-1"
          onNavigateToArmory={onNavigateToArmory}
        />
      );

      const armoryButton = screen.queryByText('Go to Armory');
      expect(armoryButton).toBeFalsy();
    });
  });

  describe('No-Racket Prompt Display (Requirement 6.5)', () => {
    it('should display no-racket prompt when player has no racket and is viewing own profile', () => {
      const playerWithoutRacket = { ...mockPlayer, mainRacketId: undefined };
      
      render(
        <PlayerProfile
          player={playerWithoutRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="player-1"
        />
      );

      expect(screen.getByText('No racket equipped!')).toBeTruthy();
      expect(screen.getByText('Forge a new one in the Armory or equip an existing racket.')).toBeTruthy();
    });

    it('should not display no-racket prompt when player has a racket', () => {
      const playerWithRacket = { ...mockPlayer, mainRacketId: 'racket-1' };
      
      render(
        <PlayerProfile
          player={playerWithRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="player-1"
        />
      );

      const noRacketPrompt = screen.queryByText('No racket equipped!');
      expect(noRacketPrompt).toBeFalsy();
    });

    it('should not display no-racket prompt when viewing another player profile', () => {
      const playerWithoutRacket = { ...mockPlayer, mainRacketId: undefined };
      
      render(
        <PlayerProfile
          player={playerWithoutRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="different-player-id"
        />
      );

      const noRacketPrompt = screen.queryByText('No racket equipped!');
      expect(noRacketPrompt).toBeFalsy();
    });

    it('should display "Equip Existing" button when player has rackets available', () => {
      const playerWithoutRacket = { ...mockPlayer, mainRacketId: undefined };
      
      render(
        <PlayerProfile
          player={playerWithoutRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={() => {}}
          currentUserId="player-1"
        />
      );

      expect(screen.getByText('Equip Existing')).toBeTruthy();
    });
  });

  describe('Integration - All Features Work Together (Requirement 6.1)', () => {
    it('should maintain all features when switching game types', () => {
      const onUpdateRacket = jest.fn();
      const onNavigateToArmory = jest.fn();
      const onUpdatePlayerName = jest.fn();
      const playerWithoutRacket = { ...mockPlayer, mainRacketId: undefined };
      
      render(
        <PlayerProfile
          player={playerWithoutRacket}
          history={[]}
          matches={[]}
          rackets={mockRackets}
          players={mockPlayers}
          onUpdateRacket={onUpdateRacket}
          currentUserId="player-1"
          onNavigateToArmory={onNavigateToArmory}
          isAdmin={true}
          onUpdatePlayerName={onUpdatePlayerName}
        />
      );

      // Verify all features are present initially
      expect(screen.getByText('No racket equipped!')).toBeTruthy();
      expect(screen.getByRole('combobox')).toBeTruthy();
      
      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.getAttribute('title') === 'Edit player name');
      expect(editButton).toBeTruthy();

      // Toggle to doubles
      const doublesButton = buttons.find(btn => btn.textContent === 'DOUBLES');
      if (doublesButton) {
        act(() => {
          fireEvent.click(doublesButton);
        });
      }

      // Verify all features still work after toggle
      expect(screen.getByText('No racket equipped!')).toBeTruthy();
      expect(screen.getByRole('combobox')).toBeTruthy();
      
      const buttonsAfterToggle = screen.getAllByRole('button');
      const editButtonAfterToggle = buttonsAfterToggle.find(btn => btn.getAttribute('title') === 'Edit player name');
      expect(editButtonAfterToggle).toBeTruthy();
    });
  });
});
