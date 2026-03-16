import { Player, GameType } from '../types';

/** Returns "First L." for multi-word names, unchanged for single-word names. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

/**
 * Determines if a player is unranked for a specific game type.
 * A player is unranked if they have an ELO of 1200 and have played zero games.
 */
export function isPlayerUnranked(player: Player, gameType: GameType): boolean {
  if (gameType === 'singles') {
    return player.eloSingles === 1200 && 
           player.winsSingles === 0 && 
           player.lossesSingles === 0;
  } else {
    return player.eloDoubles === 1200 && 
           player.winsDoubles === 0 && 
           player.lossesDoubles === 0;
  }
}

/**
 * Interface for partitioned player groups
 */
export interface PlayerPartition {
  ranked: Player[];
  unranked: Player[];
}

/**
 * Partitions players into ranked and unranked groups based on game type.
 * Ranked players have played at least one game, unranked players have not.
 */
export function partitionPlayers(
  players: Player[], 
  gameType: GameType
): PlayerPartition {
  const ranked: Player[] = [];
  const unranked: Player[] = [];
  
  for (const player of players) {
    if (isPlayerUnranked(player, gameType)) {
      unranked.push(player);
    } else {
      ranked.push(player);
    }
  }
  
  return { ranked, unranked };
}

/**
 * Sorts ranked players by ELO rating in descending order (highest first).
 * Creates a new array without mutating the input.
 */
export function sortRankedPlayers(
  players: Player[], 
  gameType: GameType
): Player[] {
  return [...players].sort((a, b) => {
    const eloA = gameType === 'singles' ? a.eloSingles : a.eloDoubles;
    const eloB = gameType === 'singles' ? b.eloSingles : b.eloDoubles;
    return eloB - eloA;
  });
}

/**
 * Sorts unranked players alphabetically by name (case-insensitive).
 * Creates a new array without mutating the input.
 */
export function sortUnrankedPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}
