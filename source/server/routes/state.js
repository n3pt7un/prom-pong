import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateMatchDelta } from '../services/elo.js';
import { INITIAL_ELO } from '../services/elo.js';

const router = Router();

router.get('/state', authMiddleware, async (req, res) => {
  try {
    const now = Date.now();
    const pendingMatches = await dbOps.getPendingMatches();

    for (const pm of pendingMatches) {
      if (pm.status === 'pending' && new Date(pm.expiresAt).getTime() <= now) {
        const players = await dbOps.getPlayers();
        const getP = (id) => players.find((p) => p.id === id);

        let wElo = 0, lElo = 0;
        if (pm.type === 'singles') {
          if (!pm.winners[0] || !pm.losers[0]) continue;
          wElo = getP(pm.winners[0])?.eloSingles || INITIAL_ELO;
          lElo = getP(pm.losers[0])?.eloSingles || INITIAL_ELO;
        } else {
          if (!pm.winners[0] || !pm.winners[1] || !pm.losers[0] || !pm.losers[1]) continue;
          wElo = ((getP(pm.winners[0])?.eloDoubles ?? INITIAL_ELO) + (getP(pm.winners[1])?.eloDoubles ?? INITIAL_ELO)) / 2;
          lElo = ((getP(pm.losers[0])?.eloDoubles ?? INITIAL_ELO) + (getP(pm.losers[1])?.eloDoubles ?? INITIAL_ELO)) / 2;
        }

        const delta = calculateMatchDelta(wElo, lElo);
        const timestamp = pm.createdAt;
        const matchId = pm.id;
        const historyEntries = [];

        const pmIsSingles = pm.type === 'singles';
        for (const p of players) {
          if (pm.winners.includes(p.id)) {
            const newElo = pmIsSingles ? p.eloSingles + delta : p.eloDoubles + delta;
            historyEntries.push({ playerId: p.id, matchId, newElo, timestamp, gameType: pm.type });
            await dbOps.updatePlayer(p.id, {
              eloSingles: pmIsSingles ? newElo : p.eloSingles,
              eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
              winsSingles: pmIsSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
              winsDoubles: !pmIsSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
              streakSingles: pmIsSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
              streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
            });
          } else if (pm.losers.includes(p.id)) {
            const newElo = pmIsSingles ? p.eloSingles - delta : p.eloDoubles - delta;
            historyEntries.push({ playerId: p.id, matchId, newElo, timestamp, gameType: pm.type });
            await dbOps.updatePlayer(p.id, {
              eloSingles: pmIsSingles ? newElo : p.eloSingles,
              eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
              lossesSingles: pmIsSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
              lossesDoubles: !pmIsSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
              streakSingles: pmIsSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
              streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
            });
          }
        }

        const newMatch = {
          id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers,
          scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser,
          timestamp, eloChange: delta, loggedBy: pm.loggedBy
        };
        await dbOps.createMatch(newMatch, pm.winners, pm.losers, historyEntries);
        await dbOps.updatePendingMatch(pm.id, { status: 'confirmed' });
      }
    }

    for (const pm of pendingMatches) {
      if (pm.status === 'confirmed' || pm.status === 'rejected') {
        await dbOps.deletePendingMatch(pm.id);
      }
    }

    // Fetch limited data for initial load (matches the frontend expectations)
    const state = await dbOps.getFullState({
      matchesLimit: 100,
      historyLimit: 200,
      challengesLimit: 50,
      tournamentsLimit: 20,
    });
    state.pendingMatches = state.pendingMatches.filter((pm) => pm.status === 'pending' || pm.status === 'disputed');

    res.json(state);
  } catch (err) {
    console.error('Error in /api/state:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
