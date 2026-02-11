import { Player, GameType } from '../types';

/**
 * Interface for game-type-specific statistics
 */
export interface GameTypeStats {
  wins: number;
  losses: number;
  streak: number;
  elo: number;
  totalGames: number;
  winRate: number;
}

/**
 * Helper function to extract game-type-specific stats from a player
 * @param player - The player object
 * @param gameType - The game type ('singles' or 'doubles')
 * @returns Object containing wins, losses, streak, and ELO for the specified game type
 */
export function getPlayerStats(
  player: Player,
  gameType: GameType
): { wins: number; losses: number; streak: number; elo: number } {
  return {
    wins: gameType === 'singles' ? player.winsSingles : player.winsDoubles,
    losses: gameType === 'singles' ? player.lossesSingles : player.lossesDoubles,
    streak: gameType === 'singles' ? player.streakSingles : player.streakDoubles,
    elo: gameType === 'singles' ? player.eloSingles : player.eloDoubles,
  };
}

/**
 * Helper function to get comprehensive game-type-specific stats including calculated values
 * @param player - The player object
 * @param gameType - The game type ('singles' or 'doubles')
 * @returns Object containing wins, losses, streak, ELO, totalGames, and winRate
 */
export function getStatsForGameType(
  player: Player,
  gameType: GameType
): GameTypeStats {
  const wins = gameType === 'singles' ? player.winsSingles : player.winsDoubles;
  const losses = gameType === 'singles' ? player.lossesSingles : player.lossesDoubles;
  const streak = gameType === 'singles' ? player.streakSingles : player.streakDoubles;
  const elo = gameType === 'singles' ? player.eloSingles : player.eloDoubles;

  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return {
    wins,
    losses,
    streak,
    elo,
    totalGames,
    winRate,
  };
}
