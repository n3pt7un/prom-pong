import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
const router = Router();

router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const players = await dbOps.getPlayers();
    const admins = await dbOps.getAdmins();

    const users = players
      .filter((p) => p.uid)
      .map((p) => ({
        uid: p.uid,
        name: p.name,
        avatar: p.avatar,
        isAdmin: admins.includes(p.uid),
      }));
    res.json(users);
  } catch (err) {
    console.error('Error in /api/admin/users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/promote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    await dbOps.addAdmin(uid);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/admin/promote:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/demote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    if (uid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }
    await dbOps.removeAdmin(uid);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/admin/demote:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/recalculate-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const players = await dbOps.getPlayers();
    const matches = await dbOps.getMatches();

    for (const p of players) {
      await dbOps.updatePlayer(p.id, {
        winsSingles: 0,
        lossesSingles: 0,
        streakSingles: 0,
        winsDoubles: 0,
        lossesDoubles: 0,
        streakDoubles: 0,
      });
    }

    const sortedMatches = [...matches].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const playerStats = {};
    for (const p of players) {
      playerStats[p.id] = {
        winsSingles: 0, lossesSingles: 0, streakSingles: 0,
        winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
      };
    }

    for (const match of sortedMatches) {
      const isSingles = match.type === 'singles';

      for (const winnerId of match.winners) {
        if (playerStats[winnerId]) {
          if (isSingles) {
            playerStats[winnerId].winsSingles++;
            playerStats[winnerId].streakSingles = playerStats[winnerId].streakSingles >= 0
              ? playerStats[winnerId].streakSingles + 1
              : 1;
          } else {
            playerStats[winnerId].winsDoubles++;
            playerStats[winnerId].streakDoubles = playerStats[winnerId].streakDoubles >= 0
              ? playerStats[winnerId].streakDoubles + 1
              : 1;
          }
        }
      }

      for (const loserId of match.losers) {
        if (playerStats[loserId]) {
          if (isSingles) {
            playerStats[loserId].lossesSingles++;
            playerStats[loserId].streakSingles = playerStats[loserId].streakSingles <= 0
              ? playerStats[loserId].streakSingles - 1
              : -1;
          } else {
            playerStats[loserId].lossesDoubles++;
            playerStats[loserId].streakDoubles = playerStats[loserId].streakDoubles <= 0
              ? playerStats[loserId].streakDoubles - 1
              : -1;
          }
        }
      }
    }

    for (const p of players) {
      const stats = playerStats[p.id];
      await dbOps.updatePlayer(p.id, stats);
    }

    res.json({
      success: true,
      message: `Recalculated stats for ${players.length} players from ${matches.length} matches`,
      playerStats,
    });
  } catch (err) {
    console.error('Error in POST /api/admin/recalculate-stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
