import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { INITIAL_ELO } from '../services/elo.js';

const router = Router();

router.post('/players', authMiddleware, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Player name is required' });
    if (name.length > 20) return res.status(400).json({ error: 'Player name must be 20 characters or less' });

    const newPlayer = {
      id: Date.now().toString(),
      name,
      avatar: req.body.avatar || '',
      mainRacketId: req.body.mainRacketId || undefined,
      eloSingles: INITIAL_ELO,
      eloDoubles: INITIAL_ELO,
      winsSingles: 0, lossesSingles: 0, streakSingles: 0,
      winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
      joinedAt: new Date().toISOString(),
      uid: req.body.uid || undefined,
    };

    const created = await dbOps.createPlayer(newPlayer);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/players/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await dbOps.updatePlayer(req.params.id, req.body);
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'Player not found' });
  } catch (err) {
    console.error('Error in PUT /api/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/players/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deletePlayer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
