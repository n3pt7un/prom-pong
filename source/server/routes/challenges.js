import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const CHALLENGE_TTL_HOURS = 24;

const buildPairKey = (a, b) => [a, b].sort().join('::');

const getTieredWager = (eloGap) => {
  if (eloGap <= 25) return 20;
  if (eloGap <= 75) return 14;
  if (eloGap <= 150) return 10;
  return 6;
};

router.get('/challenges', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    res.json(challenges);
  } catch (err) {
    console.error('Error in /api/challenges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/challenges', authMiddleware, async (req, res) => {
  try {
    const { challengedId, wager, message, gameType } = req.body;
    const challengerPlayer = await dbOps.getPlayerByUid(req.user.uid);
    if (!challengerPlayer) return res.status(400).json({ error: 'You need a player profile first' });

    const players = await dbOps.getPlayers();
    const challenged = players.find((p) => p.id === challengedId);
    if (!challenged) return res.status(404).json({ error: 'Challenged player not found' });
    if (challenged.id === challengerPlayer.id) return res.status(400).json({ error: 'Cannot challenge yourself' });

    const clampedWager = Math.max(0, Math.min(50, Number(wager) || 0));
    const challenge = {
      id: Date.now().toString(),
      challengerId: challengerPlayer.id,
      challengedId,
      status: 'pending',
      wager: clampedWager,
      createdAt: new Date().toISOString(),
      message: (message || '').trim().substring(0, 100) || undefined,
      source: 'manual',
      gameType: gameType === 'doubles' ? 'doubles' : 'singles',
      leagueId: challengerPlayer.leagueId || null,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    };

    const created = await dbOps.createChallenge(challenge);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/challenges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/challenges/generate', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    const isAdmin = admins.some((a) => a.firebaseUid === req.user.uid);
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

    const { leagueId = null, gameType = 'singles', maxPerPlayer = 1 } = req.body || {};
    if (!['singles', 'doubles'].includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }
    if (gameType === 'doubles') {
      return res.status(400).json({ error: 'Doubles challenge generation not yet supported - challenges table needs team structure (4 players)' });
    }
    const perPlayerCap = Math.max(1, Math.min(3, Number(maxPerPlayer) || 1));

    const [players, challenges] = await Promise.all([dbOps.getPlayers(), dbOps.getChallenges(500)]);
    const pool = players
      .filter((p) => leagueId ? p.leagueId === leagueId : true)
      .sort((a, b) => a.eloSingles - b.eloSingles);

    if (pool.length < 2) {
      return res.status(400).json({ error: 'Not enough players in league to generate challenges' });
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const existingRecentPairs = new Set(
      challenges
        .filter((c) => new Date(c.createdAt).getTime() >= oneDayAgo)
        .map((c) => buildPairKey(c.challengerId, c.challengedId))
    );

    const generatedCounts = new Map();
    const created = [];

    for (const challenger of pool) {
      const already = generatedCounts.get(challenger.id) || 0;
      if (already >= perPlayerCap) continue;

      const candidateOpponents = pool
        .filter((p) => p.id !== challenger.id)
        .filter((p) => (generatedCounts.get(p.id) || 0) < perPlayerCap)
        .sort((a, b) => {
          const diffA = Math.abs((challenger.eloSingles || 1200) - (a.eloSingles || 1200));
          const diffB = Math.abs((challenger.eloSingles || 1200) - (b.eloSingles || 1200));
          return diffA - diffB;
        });

      for (const opponent of candidateOpponents) {
        const key = buildPairKey(challenger.id, opponent.id);
        if (existingRecentPairs.has(key)) continue;

        const gap = Math.abs((challenger.eloSingles || 1200) - (opponent.eloSingles || 1200));
        const wager = getTieredWager(gap);
        const generatedAt = new Date().toISOString();
        const generatedChallenge = {
          id: `${Date.now()}-${challenger.id}-${opponent.id}`,
          challengerId: challenger.id,
          challengedId: opponent.id,
          status: 'pending',
          wager,
          createdAt: generatedAt,
          source: 'auto_generated',
          gameType,
          leagueId: leagueId || challenger.leagueId || null,
          generatedAt,
          expiresAt: new Date(Date.now() + CHALLENGE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
          generationReason: `ELO gap ${gap} (daily matchmaker)`,
          message: 'Auto-generated challenge of the day',
        };

        const persisted = await dbOps.createChallenge(generatedChallenge);
        created.push(persisted);
        existingRecentPairs.add(key);
        generatedCounts.set(challenger.id, (generatedCounts.get(challenger.id) || 0) + 1);
        generatedCounts.set(opponent.id, (generatedCounts.get(opponent.id) || 0) + 1);
        break;
      }
    }

    res.json({ generated: created.length, challenges: created });
  } catch (err) {
    console.error('Error in POST /api/challenges/generate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/challenges/:id/respond', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find((c) => c.id === req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const userPlayer = await dbOps.getPlayerByUid(req.user.uid);
    if (!userPlayer) return res.status(403).json({ error: 'You need a player profile first' });
    const isParticipant = [challenge.challengerId, challenge.challengedId].includes(userPlayer.id);
    const isAutoGenerated = challenge.source === 'auto_generated';
    if (!isAutoGenerated && userPlayer.id !== challenge.challengedId) {
      return res.status(403).json({ error: 'Only the challenged player can respond' });
    }
    if (isAutoGenerated && !isParticipant) {
      return res.status(403).json({ error: 'Only challenge participants can respond' });
    }
    if (challenge.status !== 'pending') return res.status(400).json({ error: 'Challenge is no longer pending' });

    const { accept } = req.body;
    const nowIso = new Date().toISOString();

    if (!isAutoGenerated) {
      const updated = await dbOps.updateChallenge(req.params.id, {
        status: accept ? 'accepted' : 'declined',
        respondedAt: nowIso,
      });
      return res.json(updated);
    }

    if (!accept) {
      const updated = await dbOps.updateChallenge(req.params.id, {
        status: 'declined',
        respondedAt: nowIso,
      });
      return res.json(updated);
    }

    const updates = {};
    if (userPlayer.id === challenge.challengerId) {
      if (challenge.challengerAcceptedAt) {
        return res.status(400).json({ error: 'You already approved this auto challenge' });
      }
      updates.challengerAcceptedAt = nowIso;
    } else {
      if (challenge.challengedAcceptedAt) {
        return res.status(400).json({ error: 'You already approved this auto challenge' });
      }
      updates.challengedAcceptedAt = nowIso;
    }

    const challengerAcceptedAt = updates.challengerAcceptedAt || challenge.challengerAcceptedAt;
    const challengedAcceptedAt = updates.challengedAcceptedAt || challenge.challengedAcceptedAt;
    const bothAccepted = Boolean(challengerAcceptedAt && challengedAcceptedAt);

    updates.status = bothAccepted ? 'accepted' : 'pending';
    if (bothAccepted) updates.respondedAt = nowIso;

    const updated = await dbOps.updateChallenge(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/challenges/:id/respond:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/challenges/:id/complete', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find((c) => c.id === req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.status !== 'accepted') return res.status(400).json({ error: 'Challenge must be accepted first' });

    const userPlayer = await dbOps.getPlayerByUid(req.user.uid);
    const admins = await dbOps.getAdmins();
    const isAdmin = admins.some((a) => a.firebaseUid === req.user.uid);
    const isParticipant = userPlayer && [challenge.challengerId, challenge.challengedId].includes(userPlayer.id);
    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'Only challenge participants or admin can complete this challenge' });
    }

    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ error: 'matchId is required to complete a challenge' });

    const matches = await dbOps.getMatches();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (challenge.gameType && match.type !== challenge.gameType) {
      return res.status(400).json({ error: `Match type must be ${challenge.gameType}` });
    }

    const challengePlayers = [challenge.challengerId, challenge.challengedId];
    const participants = [...match.winners, ...match.losers];
    const allPresent = challengePlayers.every((id) => participants.includes(id));
    if (!allPresent) {
      return res.status(400).json({ error: 'Match must include both challenge participants' });
    }

    const challengerWon = match.winners.includes(challenge.challengerId);
    const challengedWon = match.winners.includes(challenge.challengedId);
    if (challengerWon === challengedWon) {
      return res.status(400).json({ error: 'Challenge participants must be on opposing sides in the linked match' });
    }

    const updates = {
      matchId,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    if (challenge.wager > 0 && matchId) {
      const wagerPlayers = [challenge.challengerId, challenge.challengedId];
      const players = await dbOps.getPlayers();

      for (const p of players) {
        if (match.winners.includes(p.id) && wagerPlayers.includes(p.id)) {
          await dbOps.updatePlayer(p.id, { eloSingles: p.eloSingles + challenge.wager });
        } else if (match.losers.includes(p.id) && wagerPlayers.includes(p.id)) {
          await dbOps.updatePlayer(p.id, { eloSingles: Math.max(0, p.eloSingles - challenge.wager) });
        }
      }
    }

    const updated = await dbOps.updateChallenge(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/challenges/:id/complete:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/challenges/:id', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find((c) => c.id === req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const userPlayer = await dbOps.getPlayerByUid(req.user.uid);
    const admins = await dbOps.getAdmins();
    const isAdmin = admins.some(a => a.firebaseUid === req.user.uid);

    if (!isAdmin && (!userPlayer || userPlayer.id !== challenge.challengerId)) {
      return res.status(403).json({ error: 'Only the challenger or admin can cancel' });
    }

    await dbOps.deleteChallenge(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/challenges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
