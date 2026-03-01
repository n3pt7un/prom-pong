import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateSinglesInsights, calculateTeammateStats } from '../services/insights.js';

const router = Router();

/**
 * GET /api/insights/:playerId
 * 
 * Returns both singles ELO insights and doubles teammate statistics for a player.
 * 
 * Singles insights show how many consecutive wins are needed against each higher-ranked
 * opponent to surpass their ELO, along with head-to-head records.
 * 
 * Teammate statistics aggregate performance data for all doubles partnerships,
 * including win rates, matches played, and average ELO changes.
 * 
 * @param {string} playerId - The ID of the player to get insights for
 * @returns {Object} Combined response with singlesInsights and doublesTeammateStats arrays
 * 
 * **Validates: Requirements 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 */
router.get('/insights/:playerId', authMiddleware, async (req, res) => {
  try {
    const { playerId } = req.params;

    // Validate player ID
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    // Check if player exists
    const player = await dbOps.getPlayerById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fetch all players and matches
    const [players, matches] = await Promise.all([
      dbOps.getPlayers(),
      dbOps.getMatches(1000), // Get more matches for better statistics
    ]);

    // Calculate insights and statistics
    const singlesInsights = calculateSinglesInsights(playerId, players, matches);
    const doublesTeammateStats = calculateTeammateStats(playerId, players, matches);

    // Return combined response
    res.json({
      singlesInsights,
      doublesTeammateStats,
    });
  } catch (err) {
    console.error('Error in GET /api/insights/:playerId:', err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

export default router;
