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
  // Validate game type and default to 'singles' if invalid
  if (gameType !== 'singles' && gameType !== 'doubles') {
    console.warn(`Invalid game type "${gameType}" provided. Defaulting to 'singles'.`);
    gameType = 'singles';
  }

  // Extract stats with fallback to 0 for missing properties
  const wins = gameType === 'singles' 
    ? (player.winsSingles ?? 0) 
    : (player.winsDoubles ?? 0);
  const losses = gameType === 'singles' 
    ? (player.lossesSingles ?? 0) 
    : (player.lossesDoubles ?? 0);
  const streak = gameType === 'singles' 
    ? (player.streakSingles ?? 0) 
    : (player.streakDoubles ?? 0);
  const elo = gameType === 'singles' 
    ? (player.eloSingles ?? 1200) 
    : (player.eloDoubles ?? 1200);

  // Log warning if any properties are missing
  if (
    player.winsSingles === undefined || 
    player.winsDoubles === undefined ||
    player.lossesSingles === undefined || 
    player.lossesDoubles === undefined ||
    player.streakSingles === undefined || 
    player.streakDoubles === undefined ||
    player.eloSingles === undefined || 
    player.eloDoubles === undefined
  ) {
    console.warn(`Player "${player.name}" (${player.id}) has missing game-type-specific properties. Using default values.`);
  }

  return { wins, losses, streak, elo };
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
  // Validate game type and default to 'singles' if invalid
  if (gameType !== 'singles' && gameType !== 'doubles') {
    console.warn(`Invalid game type "${gameType}" provided. Defaulting to 'singles'.`);
    gameType = 'singles';
  }

  // Extract stats with fallback to 0 for missing properties
  const wins = gameType === 'singles' 
    ? (player.winsSingles ?? 0) 
    : (player.winsDoubles ?? 0);
  const losses = gameType === 'singles' 
    ? (player.lossesSingles ?? 0) 
    : (player.lossesDoubles ?? 0);
  const streak = gameType === 'singles' 
    ? (player.streakSingles ?? 0) 
    : (player.streakDoubles ?? 0);
  const elo = gameType === 'singles' 
    ? (player.eloSingles ?? 1200) 
    : (player.eloDoubles ?? 1200);

  // Log warning if any properties are missing
  if (
    player.winsSingles === undefined || 
    player.winsDoubles === undefined ||
    player.lossesSingles === undefined || 
    player.lossesDoubles === undefined ||
    player.streakSingles === undefined || 
    player.streakDoubles === undefined ||
    player.eloSingles === undefined || 
    player.eloDoubles === undefined
  ) {
    console.warn(`Player "${player.name}" (${player.id}) has missing game-type-specific properties. Using default values.`);
  }

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
