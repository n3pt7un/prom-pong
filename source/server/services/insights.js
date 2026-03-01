/**
 * Insights calculation service for ELO insights and teammate statistics
 * 
 * This service provides functions to calculate:
 * - Singles ELO insights: How many wins needed to surpass higher-ranked opponents
 * - Doubles teammate statistics: Performance metrics for each doubles partnership
 */

import { getExpectedScore, calculateNewRating } from './elo.js';

/**
 * Simulates consecutive wins to determine how many are needed to surpass a target ELO.
 * 
 * This function iterates through consecutive wins, updating the player's ELO after each win
 * while keeping the opponent's ELO constant. It uses the same ELO calculation formula
 * as the match logging system to ensure consistency.
 * 
 * @param {number} playerElo - The current ELO rating of the player
 * @param {number} targetElo - The target ELO rating to surpass (opponent's current ELO)
 * @returns {number|null} The number of consecutive wins needed, or null if unreachable within 20 wins
 * 
 * **Validates: Requirements 1.2, 4.1, 4.2, 4.3, 4.4, 4.5**
 */
export function simulateWinsNeeded(playerElo, targetElo) {
  const MAX_WINS = 20;
  let currentElo = playerElo;
  let wins = 0;

  // If player already has higher or equal ELO, no wins needed
  if (currentElo >= targetElo) {
    return 0;
  }

  // Simulate consecutive wins
  while (currentElo < targetElo && wins < MAX_WINS) {
    // Calculate expected score for this match
    const expectedScore = getExpectedScore(currentElo, targetElo);
    
    // Calculate new ELO after a win (actualScore = 1)
    currentElo = calculateNewRating(currentElo, 1, expectedScore);
    
    wins++;
  }

  // Return wins needed if target was reached, otherwise null
  return currentElo >= targetElo ? wins : null;
}

/**
 * Get head-to-head record between two players for singles matches.
 * 
 * @param {string} player1Id - The ID of the first player (perspective player)
 * @param {string} player2Id - The ID of the second player (opponent)
 * @param {Array} matches - Array of all matches
 * @returns {Object} HeadToHeadRecord with wins, losses, and total matches
 * 
 * **Validates: Requirements 1.6**
 */
export function getHeadToHeadRecord(player1Id, player2Id, matches) {
  // Filter for singles matches between these two players
  const headToHeadMatches = matches.filter(match => {
    if (match.type !== 'singles') return false;
    
    const players = [...match.winners, ...match.losers];
    return players.includes(player1Id) && players.includes(player2Id);
  });

  // Count wins for player1
  const player1Wins = headToHeadMatches.filter(match => 
    match.winners.includes(player1Id)
  ).length;

  const totalMatches = headToHeadMatches.length;
  const player1Losses = totalMatches - player1Wins;

  return {
    wins: player1Wins,
    losses: player1Losses,
    totalMatches,
  };
}

/**
 * Calculate singles insights for a player.
 * 
 * This function identifies all opponents with higher ELO than the target player,
 * calculates how many consecutive wins are needed to surpass each opponent,
 * and includes head-to-head records.
 * 
 * @param {string} playerId - The ID of the player to calculate insights for
 * @param {Array} players - Array of all players
 * @param {Array} matches - Array of all matches
 * @returns {Array} Array of SinglesInsight objects for all higher-ranked opponents
 * 
 * **Validates: Requirements 1.1, 1.2, 1.5, 1.6**
 */
export function calculateSinglesInsights(playerId, players, matches) {
  // Find the target player
  const player = players.find(p => p.id === playerId);
  if (!player) {
    return [];
  }

  // Filter players with higher singles ELO than target player
  const higherRankedPlayers = players.filter(
    p => p.id !== playerId && p.eloSingles > player.eloSingles
  );

  // Calculate insights for each higher-ranked opponent
  const insights = higherRankedPlayers.map(opponent => {
    const winsNeeded = simulateWinsNeeded(player.eloSingles, opponent.eloSingles);
    const headToHead = getHeadToHeadRecord(playerId, opponent.id, matches);

    return {
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentElo: opponent.eloSingles,
      playerElo: player.eloSingles,
      winsNeeded,
      headToHead,
    };
  });

  return insights;
}

/**
 * Get the teammate's ID from a doubles match.
 * 
 * @param {Object} match - The doubles match
 * @param {string} playerId - The ID of the player whose teammate we want to find
 * @returns {string|null} The teammate's ID, or null if not found or not a doubles match
 */
function getTeammateFromMatch(match, playerId) {
  if (match.type !== 'doubles') return null;
  
  // Check if player is in winners
  if (match.winners.includes(playerId)) {
    const teammate = match.winners.find(id => id !== playerId);
    return teammate || null;
  }
  
  // Check if player is in losers
  if (match.losers.includes(playerId)) {
    const teammate = match.losers.find(id => id !== playerId);
    return teammate || null;
  }
  
  return null;
}

/**
 * Check if a player was on the winning team in a match.
 * 
 * @param {Object} match - The match to check
 * @param {string} playerId - The ID of the player
 * @returns {boolean} True if the player was a winner, false otherwise
 */
function isWinner(match, playerId) {
  return match.winners.includes(playerId);
}

/**
 * Get the ELO change for a specific player in a match.
 * 
 * @param {Object} match - The match
 * @param {string} playerId - The ID of the player
 * @returns {number} The ELO change (positive for winners, negative for losers)
 */
function getEloChangeForPlayer(match, playerId) {
  if (match.winners.includes(playerId)) {
    return match.eloChange;
  }
  if (match.losers.includes(playerId)) {
    return -match.eloChange;
  }
  return 0;
}

/**
 * Calculate doubles teammate statistics for a player.
 * 
 * This function aggregates performance data for all doubles partnerships,
 * filtering out friendly matches and unconfirmed matches. It calculates
 * wins, losses, win rate, and average ELO change for each teammate.
 * 
 * @param {string} playerId - The ID of the player to calculate stats for
 * @param {Array} players - Array of all players
 * @param {Array} matches - Array of all matches
 * @returns {Array} Array of TeammateStatistics objects for all teammates
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 5.5**
 */
export function calculateTeammateStats(playerId, players, matches) {
  // Filter for confirmed doubles matches that are not friendly
  const doublesMatches = matches.filter(match => 
    match.type === 'doubles' && 
    !match.isFriendly &&
    (match.winners.includes(playerId) || match.losers.includes(playerId))
  );

  // Group matches by teammate
  const teammateMap = new Map();
  
  for (const match of doublesMatches) {
    const teammateId = getTeammateFromMatch(match, playerId);
    if (!teammateId) continue;
    
    if (!teammateMap.has(teammateId)) {
      teammateMap.set(teammateId, []);
    }
    teammateMap.get(teammateId).push(match);
  }

  // Calculate statistics for each teammate
  const stats = [];
  
  for (const [teammateId, teammateMatches] of teammateMap.entries()) {
    const teammate = players.find(p => p.id === teammateId);
    if (!teammate) continue;
    
    const wins = teammateMatches.filter(m => isWinner(m, playerId)).length;
    const losses = teammateMatches.length - wins;
    const winRate = (wins / teammateMatches.length) * 100;
    
    const totalEloChange = teammateMatches.reduce((sum, match) => {
      return sum + getEloChangeForPlayer(match, playerId);
    }, 0);
    const avgEloChange = totalEloChange / teammateMatches.length;
    
    stats.push({
      teammateId,
      teammateName: teammate.name,
      teammateElo: teammate.eloDoubles,
      matchesPlayed: teammateMatches.length,
      wins,
      losses,
      winRate: Math.round(winRate),
      avgEloChange: Math.round(avgEloChange * 10) / 10, // Round to 1 decimal
    });
  }

  return stats;
}
