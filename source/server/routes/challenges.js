import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

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
    const { challengedId, wager, message } = req.body;
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
    };

    const created = await dbOps.createChallenge(challenge);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/challenges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/challenges/:id/respond', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find((c) => c.id === req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const userPlayer = await dbOps.getPlayerByUid(req.user.uid);
    if (!userPlayer || userPlayer.id !== challenge.challengedId) {
      return res.status(403).json({ error: 'Only the challenged player can respond' });
    }
    if (challenge.status !== 'pending') return res.status(400).json({ error: 'Challenge is no longer pending' });

    const { accept } = req.body;
    const updated = await dbOps.updateChallenge(req.params.id, { status: accept ? 'accepted' : 'declined' });
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

    const { matchId } = req.body;
    const updates = { matchId, status: 'completed' };

    if (challenge.wager > 0 && matchId) {
      const matches = await dbOps.getMatches();
      const match = matches.find((m) => m.id === matchId);
      if (match) {
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
    const isAdmin = admins.includes(req.user.uid);

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
