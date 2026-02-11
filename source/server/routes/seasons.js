import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { INITIAL_ELO } from '../services/elo.js';

const router = Router();

router.get('/seasons', authMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    res.json(seasons);
  } catch (err) {
    console.error('Error in /api/seasons:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/seasons/start', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    const activeSeason = seasons.find((s) => s.status === 'active');
    if (activeSeason) return res.status(400).json({ error: 'A season is already active. End it first.' });

    const seasonNumber = seasons.length + 1;
    const name = (req.body.name || '').trim() || `Season ${seasonNumber}`;
    const season = {
      id: Date.now().toString(),
      name,
      number: seasonNumber,
      status: 'active',
      startedAt: new Date().toISOString(),
      finalStandings: [],
      matchCount: 0,
    };

    await dbOps.resetPlayers({
      eloSingles: INITIAL_ELO,
      eloDoubles: INITIAL_ELO,
      winsSingles: 0, lossesSingles: 0, streakSingles: 0,
      winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
    });
    await dbOps.clearMatches();

    const created = await dbOps.createSeason(season);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/seasons/start:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/seasons/end', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    const idx = seasons.findIndex((s) => s.status === 'active');
    if (idx === -1) return res.status(400).json({ error: 'No active season to end' });

    const players = await dbOps.getPlayers();
    const standings = [...players]
      .sort((a, b) => b.eloSingles - a.eloSingles)
      .map((p, i) => ({
        playerId: p.id, playerName: p.name, rank: i + 1,
        eloSingles: p.eloSingles, eloDoubles: p.eloDoubles,
        wins: p.wins, losses: p.losses,
      }));

    const matches = await dbOps.getMatches();
    const updated = await dbOps.updateSeason(seasons[idx].id, {
      status: 'completed',
      endedAt: new Date().toISOString(),
      finalStandings: standings,
      matchCount: matches.length,
      championId: standings.length > 0 ? standings[0].playerId : undefined,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error in POST /api/seasons/end:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
