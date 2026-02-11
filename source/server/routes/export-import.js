import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { isSupabaseEnabled } from '../../lib/supabase.ts';
import { supabase } from '../../lib/supabase.ts';
import { getDB, saveDB, seedData } from '../db/persistence.js';

const router = Router();

router.get('/export', authMiddleware, async (req, res) => {
  try {
    const state = await dbOps.getFullState();
    res.json({
      players: state.players,
      matches: state.matches,
      history: state.history,
      rackets: state.rackets,
    });
  } catch (err) {
    console.error('Error in /api/export:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/import', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { players, matches, history, rackets } = req.body;
    if (!Array.isArray(players) || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Invalid import data: players and matches must be arrays' });
    }

    if (isSupabaseEnabled()) {
      for (const p of players) {
        await supabase.from('players').upsert({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          bio: p.bio,
          elo_singles: p.eloSingles,
          elo_doubles: p.eloDoubles,
          wins_singles: p.winsSingles ?? 0,
          losses_singles: p.lossesSingles ?? 0,
          streak_singles: p.streakSingles ?? 0,
          wins_doubles: p.winsDoubles ?? 0,
          losses_doubles: p.lossesDoubles ?? 0,
          streak_doubles: p.streakDoubles ?? 0,
          joined_at: p.joinedAt,
          main_racket_id: p.mainRacketId,
          firebase_uid: p.uid,
        });
      }
    } else {
      const db = getDB();
      db.players = players;
      db.matches = matches;
      db.history = Array.isArray(history) ? history : [];
      db.rackets = Array.isArray(rackets) ? rackets : db.rackets;
      await saveDB();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/import:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.body.mode === 'season') {
      await dbOps.resetPlayers({
        eloSingles: 1200,
        eloDoubles: 1200,
        winsSingles: 0, lossesSingles: 0, streakSingles: 0,
        winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
      });
      await dbOps.clearMatches();
    } else if (req.body.mode === 'fresh') {
      await dbOps.clearAllData();
    } else {
      seedData();
      await saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/reset:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
