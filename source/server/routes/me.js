import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';
import { shouldAutoPromote } from '../middleware/auth.js';
import { INITIAL_ELO } from '../services/elo.js';

const router = Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    if (shouldAutoPromote(email)) {
      const admins = await dbOps.getAdmins();
      if (!admins.includes(uid)) {
        await dbOps.addAdmin(uid);
        console.log(`👑 Auto-promoted admin: ${email}`);
      }
    }

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(uid);
    const player = await dbOps.getPlayerByUid(uid);
    const players = await dbOps.getPlayers();

    const response = {
      uid,
      email,
      displayName: name,
      photoURL: picture,
      isAdmin,
      player,
      needsSetup: !player,
    };

    if (!player) {
      response.unclaimedPlayers = players.filter((p) => !p.uid);
    }

    res.json(response);
  } catch (err) {
    console.error('Error in /api/me:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/me/setup', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;

    const existing = await dbOps.getPlayerByUid(uid);
    if (existing) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Username is required' });
    if (name.length > 20) return res.status(400).json({ error: 'Username must be 20 characters or less' });

    const player = {
      id: Date.now().toString(),
      name,
      avatar: req.body.avatar || req.user.picture || '',
      bio: (req.body.bio || '').trim().substring(0, 150),
      eloSingles: INITIAL_ELO,
      eloDoubles: INITIAL_ELO,
      winsSingles: 0, lossesSingles: 0, streakSingles: 0,
      winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
      joinedAt: new Date().toISOString(),
      uid,
    };

    await dbOps.createPlayer(player);
    console.log(`🆕 Profile created for ${req.user.email}: "${player.name}"`);

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(uid);

    res.json({
      uid,
      email: req.user.email,
      displayName: req.user.name,
      photoURL: req.user.picture,
      isAdmin,
      player,
      needsSetup: false,
    });
  } catch (err) {
    console.error('Error in /api/me/setup:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/me/claim', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;

    const existing = await dbOps.getPlayerByUid(uid);
    if (existing) {
      return res.status(400).json({ error: 'You already have a player profile' });
    }

    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId is required' });

    const player = await dbOps.getPlayerById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (player.uid) return res.status(400).json({ error: 'This player is already linked to an account' });

    await dbOps.updatePlayer(playerId, { uid });
    console.log(`🔗 Player "${player.name}" claimed by ${req.user.email}`);

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(uid);
    const updatedPlayer = await dbOps.getPlayerById(playerId);

    res.json({
      uid,
      email: req.user.email,
      displayName: req.user.name,
      photoURL: req.user.picture,
      isAdmin,
      player: updatedPlayer,
      needsSetup: false,
    });
  } catch (err) {
    console.error('Error in /api/me/claim:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me/profile', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;
    const player = await dbOps.getPlayerByUid(uid);

    if (!player) return res.status(404).json({ error: 'Player profile not found' });

    const updates = {};
    if (req.body.name !== undefined) {
      const name = (req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Username is required' });
      if (name.length > 20) return res.status(400).json({ error: 'Username must be 20 characters or less' });
      updates.name = name;
    }
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
    if (req.body.bio !== undefined) updates.bio = (req.body.bio || '').trim().substring(0, 150);

    const updated = await dbOps.updatePlayer(player.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in /api/me/profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
