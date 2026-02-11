import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/tournaments', authMiddleware, async (req, res) => {
  try {
    const tournaments = await dbOps.getTournaments();
    res.json(tournaments);
  } catch (err) {
    console.error('Error in /api/tournaments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/tournaments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, format, gameType, playerIds } = req.body;
    if (!name || !format || !gameType || !Array.isArray(playerIds)) {
      return res.status(400).json({ error: 'name, format, gameType, and playerIds are required' });
    }
    if (!['single_elimination', 'round_robin'].includes(format)) {
      return res.status(400).json({ error: 'Format must be single_elimination or round_robin' });
    }
    if (playerIds.length < 2) return res.status(400).json({ error: 'At least 2 players required' });

    const players = await dbOps.getPlayers();
    for (const id of playerIds) {
      if (!players.find((p) => p.id === id)) {
        return res.status(400).json({ error: `Player "${id}" not found` });
      }
    }

    let rounds = [];
    if (format === 'single_elimination') {
      const eloKey = gameType === 'singles' ? 'eloSingles' : 'eloDoubles';
      const seeded = playerIds
        .map((id) => players.find((p) => p.id === id))
        .sort((a, b) => b[eloKey] - a[eloKey])
        .map((p) => p.id);

      let size = 1;
      while (size < seeded.length) size *= 2;
      while (seeded.length < size) seeded.push(null);

      const firstRound = [];
      for (let i = 0; i < size / 2; i++) {
        firstRound.push({
          id: `m-${Date.now()}-${i}`,
          player1Id: seeded[i],
          player2Id: seeded[size - 1 - i],
        });
      }
      rounds.push({ roundNumber: 1, matchups: firstRound });

      let prevSize = firstRound.length;
      let roundNum = 2;
      while (prevSize > 1) {
        const nextRound = [];
        for (let i = 0; i < prevSize / 2; i++) {
          nextRound.push({ id: `m-${Date.now()}-r${roundNum}-${i}`, player1Id: null, player2Id: null });
        }
        rounds.push({ roundNumber: roundNum, matchups: nextRound });
        prevSize = nextRound.length;
        roundNum++;
      }

      firstRound.forEach((matchup, idx) => {
        if (matchup.player1Id && !matchup.player2Id) {
          matchup.winnerId = matchup.player1Id;
          const nextMatchIdx = Math.floor(idx / 2);
          if (rounds[1]) {
            if (idx % 2 === 0) rounds[1].matchups[nextMatchIdx].player1Id = matchup.player1Id;
            else rounds[1].matchups[nextMatchIdx].player2Id = matchup.player1Id;
          }
        } else if (!matchup.player1Id && matchup.player2Id) {
          matchup.winnerId = matchup.player2Id;
          const nextMatchIdx = Math.floor(idx / 2);
          if (rounds[1]) {
            if (idx % 2 === 0) rounds[1].matchups[nextMatchIdx].player1Id = matchup.player2Id;
            else rounds[1].matchups[nextMatchIdx].player2Id = matchup.player2Id;
          }
        }
      });
    } else {
      const allMatchups = [];
      for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
          allMatchups.push({
            id: `m-${Date.now()}-${i}-${j}`,
            player1Id: playerIds[i],
            player2Id: playerIds[j],
          });
        }
      }
      const matchesPerRound = Math.floor(playerIds.length / 2);
      let roundNum = 1;
      for (let i = 0; i < allMatchups.length; i += matchesPerRound) {
        rounds.push({ roundNumber: roundNum++, matchups: allMatchups.slice(i, i + matchesPerRound) });
      }
    }

    const tournament = {
      id: Date.now().toString(),
      name: name.trim(),
      format,
      status: 'in_progress',
      gameType,
      playerIds,
      rounds,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    const created = await dbOps.createTournament(tournament);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/tournaments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/tournaments/:id/result', authMiddleware, async (req, res) => {
  try {
    const tournaments = await dbOps.getTournaments();
    const tournament = tournaments.find((t) => t.id === req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (tournament.status !== 'in_progress') return res.status(400).json({ error: 'Tournament is not in progress' });

    const { matchupId, winnerId, score1, score2 } = req.body;
    let found = false;

    for (const round of tournament.rounds) {
      const matchup = round.matchups.find((m) => m.id === matchupId);
      if (matchup) {
        matchup.winnerId = winnerId;
        matchup.scorePlayer1 = score1;
        matchup.scorePlayer2 = score2;
        found = true;

        if (tournament.format === 'single_elimination') {
          const roundIdx = tournament.rounds.indexOf(round);
          const matchupIdx = round.matchups.indexOf(matchup);
          const nextRound = tournament.rounds[roundIdx + 1];
          if (nextRound) {
            const nextMatchIdx = Math.floor(matchupIdx / 2);
            if (matchupIdx % 2 === 0) nextRound.matchups[nextMatchIdx].player1Id = winnerId;
            else nextRound.matchups[nextMatchIdx].player2Id = winnerId;
          }
        }
        break;
      }
    }

    if (!found) return res.status(404).json({ error: 'Matchup not found' });

    const allMatchups = tournament.rounds.flatMap((r) => r.matchups).filter((m) => m.player1Id && m.player2Id);
    const allComplete = allMatchups.every((m) => m.winnerId);

    let tournamentWinnerId = tournament.winnerId;
    let completedAt = tournament.completedAt;
    let status = tournament.status;

    if (allComplete) {
      status = 'completed';
      completedAt = new Date().toISOString();
      if (tournament.format === 'single_elimination') {
        const finalRound = tournament.rounds[tournament.rounds.length - 1];
        tournamentWinnerId = finalRound.matchups[0]?.winnerId;
      } else {
        const winCounts = {};
        allMatchups.forEach((m) => { winCounts[m.winnerId] = (winCounts[m.winnerId] || 0) + 1; });
        const sorted = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);
        tournamentWinnerId = sorted[0]?.[0];
      }
    }

    const updated = await dbOps.updateTournament(req.params.id, {
      rounds: tournament.rounds,
      status,
      winnerId: tournamentWinnerId,
      completedAt,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/tournaments/:id/result:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/tournaments/:id/players', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tournaments = await dbOps.getTournaments();
    const tournament = tournaments.find((t) => t.id === req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (tournament.status !== 'registration') return res.status(400).json({ error: 'Can only modify players during registration' });

    const { playerIds } = req.body;
    if (!Array.isArray(playerIds) || playerIds.length < 2) return res.status(400).json({ error: 'At least 2 players required' });

    const updated = await dbOps.updateTournament(req.params.id, { playerIds });
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/tournaments/:id/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/tournaments/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deleteTournament(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/tournaments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
