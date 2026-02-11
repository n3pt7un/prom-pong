import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { calculateMatchDelta } from '../services/elo.js';
import { INITIAL_ELO } from '../services/elo.js';

const router = Router();

router.post('/pending-matches', authMiddleware, async (req, res) => {
  try {
    const { type, winners, losers, scoreWinner, scoreLoser } = req.body;
    if (!type || !['singles', 'doubles'].includes(type)) return res.status(400).json({ error: 'Invalid game type' });
    if (!Array.isArray(winners) || !Array.isArray(losers)) return res.status(400).json({ error: 'Winners and losers must be arrays' });

    const players = await dbOps.getPlayers();

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    if (!isAdmin) {
      const callerPlayer = players.find((p) => p.uid === req.user.uid);
      if (!callerPlayer) return res.status(403).json({ error: 'You need a player profile to log matches' });
      const allParticipants = [...winners, ...losers];
      if (!allParticipants.includes(callerPlayer.id)) {
        return res.status(403).json({ error: 'You can only log matches where you are a participant' });
      }
    }

    for (const id of [...winners, ...losers]) {
      if (!players.find((p) => p.id === id)) return res.status(400).json({ error: `Player "${id}" not found` });
    }

    const pending = {
      id: Date.now().toString(),
      type, winners, losers, scoreWinner, scoreLoser,
      loggedBy: req.user.uid,
      status: 'pending',
      confirmations: [req.user.uid],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const created = await dbOps.createPendingMatch(pending, winners, losers);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/pending-matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/pending-matches/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const pendingMatches = await dbOps.getPendingMatches();
    const pm = pendingMatches.find((m) => m.id === req.params.id);
    if (!pm) return res.status(404).json({ error: 'Pending match not found' });
    if (pm.status !== 'pending') return res.status(400).json({ error: 'Match is not pending' });

    const confirmations = [...pm.confirmations];
    if (!confirmations.includes(req.user.uid)) confirmations.push(req.user.uid);

    const players = await dbOps.getPlayers();
    const involvedUids = [...pm.winners, ...pm.losers]
      .map((id) => players.find((p) => p.id === id)?.uid)
      .filter(Boolean);
    const allConfirmed = involvedUids.every((uid) => confirmations.includes(uid));

    if (allConfirmed || involvedUids.length <= 1) {
      const getP = (id) => players.find((p) => p.id === id);
      let wElo = 0, lElo = 0;
      if (pm.type === 'singles') {
        if (!pm.winners[0] || !pm.losers[0] || !getP(pm.winners[0]) || !getP(pm.losers[0])) {
          return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
        }
        wElo = getP(pm.winners[0]).eloSingles;
        lElo = getP(pm.losers[0]).eloSingles;
      } else {
        if (!pm.winners[0] || !pm.winners[1] || !pm.losers[0] || !pm.losers[1]) {
          return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
        }
        const w1 = getP(pm.winners[0]);
        const w2 = getP(pm.winners[1]);
        const l1 = getP(pm.losers[0]);
        const l2 = getP(pm.losers[1]);
        if (!w1 || !w2 || !l1 || !l2) return res.status(400).json({ error: 'One or more players not found' });
        wElo = (w1.eloDoubles + w2.eloDoubles) / 2;
        lElo = (l1.eloDoubles + l2.eloDoubles) / 2;
      }

      const delta = calculateMatchDelta(wElo, lElo);
      const timestamp = pm.createdAt;
      const confirmMatchId = pm.id;
      const historyEntries = [];

      const pmIsSingles = pm.type === 'singles';
      for (const p of players) {
        if (pm.winners.includes(p.id)) {
          const newElo = pmIsSingles ? p.eloSingles + delta : p.eloDoubles + delta;
          historyEntries.push({ playerId: p.id, matchId: confirmMatchId, newElo, timestamp, gameType: pm.type });
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
          historyEntries.push({ playerId: p.id, matchId: confirmMatchId, newElo, timestamp, gameType: pm.type });
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
      await dbOps.deletePendingMatch(pm.id);
      return res.json({ ...pm, status: 'confirmed', confirmations, match: newMatch });
    }

    await dbOps.updatePendingMatch(pm.id, { confirmations });
    res.json({ ...pm, confirmations });
  } catch (err) {
    console.error('Error in PUT /api/pending-matches/:id/confirm:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/pending-matches/:id/dispute', authMiddleware, async (req, res) => {
  try {
    const updated = await dbOps.updatePendingMatch(req.params.id, { status: 'disputed' });
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'Pending match not found' });
  } catch (err) {
    console.error('Error in PUT /api/pending-matches/:id/dispute:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/pending-matches/:id/force-confirm', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pendingMatches = await dbOps.getPendingMatches();
    const pm = pendingMatches.find((m) => m.id === req.params.id);
    if (!pm) return res.status(404).json({ error: 'Pending match not found' });

    const players = await dbOps.getPlayers();
    const getP = (id) => players.find((p) => p.id === id);
    let wElo = 0, lElo = 0;
    if (pm.type === 'singles') {
      if (!pm.winners[0] || !pm.losers[0] || !getP(pm.winners[0]) || !getP(pm.losers[0])) {
        return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
      }
      wElo = getP(pm.winners[0]).eloSingles;
      lElo = getP(pm.losers[0]).eloSingles;
    } else {
      if (!pm.winners[0] || !pm.winners[1] || !pm.losers[0] || !pm.losers[1]) {
        return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
      }
      const w1 = getP(pm.winners[0]);
      const w2 = getP(pm.winners[1]);
      const l1 = getP(pm.losers[0]);
      const l2 = getP(pm.losers[1]);
      if (!w1 || !w2 || !l1 || !l2) return res.status(400).json({ error: 'One or more players not found' });
      wElo = (w1.eloDoubles + w2.eloDoubles) / 2;
      lElo = (l1.eloDoubles + l2.eloDoubles) / 2;
    }

    const delta = calculateMatchDelta(wElo, lElo);
    const timestamp = pm.createdAt;
    const forceMatchId = pm.id;
    const historyEntries = [];

    const pmIsSingles = pm.type === 'singles';
    for (const p of players) {
      if (pm.winners.includes(p.id)) {
        const newElo = pmIsSingles ? p.eloSingles + delta : p.eloDoubles + delta;
        historyEntries.push({ playerId: p.id, matchId: forceMatchId, newElo, timestamp, gameType: pm.type });
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
        historyEntries.push({ playerId: p.id, matchId: forceMatchId, newElo, timestamp, gameType: pm.type });
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
    await dbOps.deletePendingMatch(pm.id);

    res.json({ ...pm, status: 'confirmed', match: newMatch });
  } catch (err) {
    console.error('Error in PUT /api/pending-matches/:id/force-confirm:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/pending-matches/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deletePendingMatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/pending-matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
