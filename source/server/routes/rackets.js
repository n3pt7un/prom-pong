import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { STAT_BUDGET } from '../config.js';

const router = Router();

router.post('/rackets', authMiddleware, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Racket name is required' });

    let stats = req.body.stats;

    if (stats && typeof stats === 'object') {
      const statKeys = ['speed', 'spin', 'power', 'control', 'defense', 'chaos'];
      const total = statKeys.reduce((sum, key) => sum + (Number(stats[key]) || 0), 0);
      if (total > STAT_BUDGET) {
        return res.status(400).json({ error: `Stat budget exceeded: ${total}/${STAT_BUDGET}` });
      }
      stats = {};
      for (const key of statKeys) {
        stats[key] = Math.max(0, Math.min(20, Math.round(Number(req.body.stats[key]) || 0)));
      }
    }

    const newRacket = {
      id: Date.now().toString(),
      name,
      icon: req.body.icon || 'Zap',
      color: req.body.color || '#00f3ff',
      stats: stats || { speed: 5, spin: 5, power: 5, control: 5, defense: 5, chaos: 5 },
      createdBy: req.user.uid,
    };

    const created = await dbOps.createRacket(newRacket);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/rackets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/rackets/:id', authMiddleware, async (req, res) => {
  try {
    const rackets = await dbOps.getRackets();
    const racket = rackets.find((r) => r.id === req.params.id);
    if (!racket) return res.status(404).json({ error: 'Racket not found' });

    const updates = {};
    const { name, icon, color, stats } = req.body;

    if (name !== undefined) {
      const trimmed = (name || '').trim();
      if (!trimmed) return res.status(400).json({ error: 'Racket name cannot be empty' });
      updates.name = trimmed;
    }
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;

    if (stats && typeof stats === 'object') {
      const statKeys = ['speed', 'spin', 'power', 'control', 'defense', 'chaos'];
      const validated = {};
      for (const key of statKeys) {
        validated[key] = Math.max(0, Math.min(20, Math.round(Number(stats[key]) || 0)));
      }
      const total = statKeys.reduce((sum, key) => sum + validated[key], 0);
      if (total > STAT_BUDGET) {
        return res.status(400).json({ error: `Stat budget exceeded: ${total}/${STAT_BUDGET}` });
      }
      updates.stats = validated;
    }

    const updated = await dbOps.updateRacket(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/rackets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/rackets/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deleteRacket(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/rackets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
