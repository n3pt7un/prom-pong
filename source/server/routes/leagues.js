import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/leagues', authMiddleware, async (req, res) => {
  try {
    const leagues = await dbOps.getLeagues();
    res.json(leagues);
  } catch (err) {
    console.error('Error in GET /api/leagues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/leagues', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'League name is required' });

    const league = await dbOps.createLeague({
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim() || null,
      createdBy: req.user.uid,
    });

    res.json(league);
  } catch (err) {
    console.error('Error in POST /api/leagues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/leagues/:id', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    const league = await dbOps.updateLeague(req.params.id, updates);
    res.json(league);
  } catch (err) {
    console.error('Error in PUT /api/leagues/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/leagues/:id', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    await dbOps.deleteLeague(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/leagues/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/players/:id/league', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    const { leagueId } = req.body;
    if (leagueId) {
      const league = await dbOps.getLeagueById(leagueId);
      if (!league) return res.status(400).json({ error: 'League not found' });
    }

    await dbOps.assignPlayerLeague(req.params.id, leagueId || null);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /api/players/:id/league:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
