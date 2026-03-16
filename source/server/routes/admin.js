import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Get admin dashboard statistics
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await dbOps.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Error in GET /api/admin/stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (players with their Firebase UIDs)
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const players = await dbOps.getPlayers();
    const admins = await dbOps.getAdmins();
    
    const users = players.map(player => ({
      ...player,
      isAdmin: admins.some(admin => admin.firebaseUid === player.uid),
    }));
    
    res.json(users);
  } catch (err) {
    console.error('Error in GET /api/admin/users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user details (admin can edit any player)
router.put('/admin/users/:playerId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = req.body;
    
    // Validate updates
    const allowedFields = [
      'name', 'avatar', 'bio', 'eloSingles', 'eloDoubles',
      'winsSingles', 'lossesSingles', 'streakSingles',
      'winsDoubles', 'lossesDoubles', 'streakDoubles',
      'leagueId', 'mainRacketId'
    ];
    
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    const updated = await dbOps.updatePlayer(playerId, filteredUpdates);
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/admin/users/:playerId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/admin/users/:playerId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { playerId } = req.params;
    await dbOps.deletePlayer(playerId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/admin/users/:playerId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all admins
router.get('/admin/admins', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    const players = await dbOps.getPlayers();
    
    // Enrich admin data with player info
    const enrichedAdmins = admins.map(admin => {
      const player = players.find(p => p.uid === admin.firebaseUid);
      return {
        ...admin,
        playerName: player?.name,
        playerAvatar: player?.avatar,
      };
    });
    
    res.json(enrichedAdmins);
  } catch (err) {
    console.error('Error in GET /api/admin/admins:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add admin
router.post('/admin/admins', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({ error: 'Firebase UID is required' });
    }
    
    const admin = await dbOps.addAdmin(firebaseUid);
    res.json(admin);
  } catch (err) {
    console.error('Error in POST /api/admin/admins:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove admin
router.delete('/admin/admins/:firebaseUid', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { firebaseUid } = req.params;
    
    // Prevent removing yourself
    if (firebaseUid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot remove yourself as admin' });
    }
    
    await dbOps.removeAdmin(firebaseUid);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/admin/admins/:firebaseUid:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all matches with full details
router.get('/admin/matches', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const matches = await dbOps.getMatches();
    const players = await dbOps.getPlayers();
    
    // Enrich matches with player names
    const enrichedMatches = matches.map(match => ({
      ...match,
      winnerNames: match.winners.map(id => players.find(p => p.id === id)?.name || id),
      loserNames: match.losers.map(id => players.find(p => p.id === id)?.name || id),
    }));
    
    res.json(enrichedMatches);
  } catch (err) {
    console.error('Error in GET /api/admin/matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete match
router.delete('/admin/matches/:matchId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    await dbOps.deleteMatch(matchId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/admin/matches/:matchId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all leagues
router.get('/admin/leagues', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const leagues = await dbOps.getLeagues();
    const players = await dbOps.getPlayers();
    
    // Add player count to each league
    const enrichedLeagues = leagues.map(league => ({
      ...league,
      playerCount: players.filter(p => p.leagueId === league.id).length,
    }));
    
    res.json(enrichedLeagues);
  } catch (err) {
    console.error('Error in GET /api/admin/leagues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create league
router.post('/admin/leagues', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'League name is required' });
    }
    
    const league = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };
    
    const created = await dbOps.createLeague(league);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/admin/leagues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update league
router.put('/admin/leagues/:leagueId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { name, description } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    
    const updated = await dbOps.updateLeague(leagueId, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/admin/leagues/:leagueId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete league
router.delete('/admin/leagues/:leagueId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    await dbOps.deleteLeague(leagueId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/admin/leagues/:leagueId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all seasons with details
router.get('/admin/seasons', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    res.json(seasons);
  } catch (err) {
    console.error('Error in GET /api/admin/seasons:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete season
router.delete('/admin/seasons/:seasonId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { seasonId } = req.params;
    const seasons = await dbOps.getSeasons();
    const season = seasons.find(s => s.id === seasonId);
    
    if (season && season.status === 'active') {
      return res.status(400).json({ error: 'Cannot delete active season. End it first.' });
    }
    
    await dbOps.deleteSeason(seasonId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/admin/seasons/:seasonId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ELO formula configuration
router.get('/admin/elo-config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const config = await dbOps.getEloConfig();
    res.json(config);
  } catch (err) {
    console.error('Error in GET /api/admin/elo-config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ELO formula configuration
router.put('/admin/elo-config', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const config = await dbOps.saveEloConfig(req.body);
    res.json(config);
  } catch (err) {
    console.error('Error in PUT /api/admin/elo-config:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Recalculate all ELO ratings from match history
router.post('/admin/recalculate-elo', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await dbOps.recalculateElo();
    res.json(result);
  } catch (err) {
    console.error('Error in POST /api/admin/recalculate-elo:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get challenge generation schedule settings
router.get('/admin/settings/challenge-schedule', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await dbOps.getChallengeScheduleSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error in GET /api/admin/settings/challenge-schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update challenge generation schedule settings
router.put('/admin/settings/challenge-schedule', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await dbOps.saveChallengeScheduleSettings(req.body);
    res.json(settings);
  } catch (err) {
    console.error('Error in PUT /api/admin/settings/challenge-schedule:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
