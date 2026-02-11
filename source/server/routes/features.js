import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/player-of-week', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const matches = await dbOps.getMatches();
    const weekMatches = matches.filter((m) => new Date(m.timestamp) >= weekStart);

    if (weekMatches.length === 0) return res.json({ player: null, stats: null });

    const players = await dbOps.getPlayers();
    const scores = {};

    for (const p of players) {
      const wins = weekMatches.filter((m) => m.winners.includes(p.id)).length;
      const losses = weekMatches.filter((m) => m.losers.includes(p.id)).length;
      const eloGained = weekMatches.filter((m) => m.winners.includes(p.id)).reduce((sum, m) => sum + m.eloChange, 0);
      const streak = Math.max(0, p.streak ?? 0);
      const score = wins * 3 + eloGained * 0.5 + streak * 2;
      if (wins + losses > 0) {
        scores[p.id] = { playerId: p.id, wins, losses, matches: wins + losses, eloGained, score, winRate: wins / (wins + losses) };
      }
    }

    const sorted = Object.values(scores).sort((a, b) => b.score - a.score || b.winRate - a.winRate || b.matches - a.matches);
    if (sorted.length === 0) return res.json({ player: null, stats: null });

    const winner = sorted[0];
    const player = players.find((p) => p.id === winner.playerId);
    res.json({ player, stats: winner });
  } catch (err) {
    console.error('Error in /api/player-of-week:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/hall-of-fame', authMiddleware, async (req, res) => {
  try {
    const records = {};
    const history = await dbOps.getHistory();
    const players = await dbOps.getPlayers();
    const matches = await dbOps.getMatches();

    if (history.length > 0) {
      const singlesHistory = history.filter((h) => h.gameType === 'singles');
      if (singlesHistory.length > 0) {
        const best = singlesHistory.reduce((max, h) => (h.newElo > max.newElo ? h : max));
        const player = players.find((p) => p.id === best.playerId);
        records.highestEloSingles = { playerId: best.playerId, playerName: player?.name, value: best.newElo, date: best.timestamp };
      }
      const doublesHistory = history.filter((h) => h.gameType === 'doubles');
      if (doublesHistory.length > 0) {
        const best = doublesHistory.reduce((max, h) => (h.newElo > max.newElo ? h : max));
        const player = players.find((p) => p.id === best.playerId);
        records.highestEloDoubles = { playerId: best.playerId, playerName: player?.name, value: best.newElo, date: best.timestamp };
      }
    }

    if (players.length > 0) {
      const most = [...players].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))[0];
      records.mostMatchesPlayed = { playerId: most.id, playerName: most.name, value: most.wins + most.losses };
    }

    const qualified = players.filter((p) => p.wins + p.losses >= 20);
    if (qualified.length > 0) {
      const best = qualified.sort((a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses))[0];
      records.bestWinRate = { playerId: best.id, playerName: best.name, value: Math.round(100 * best.wins / (best.wins + best.losses)) };
    }

    if (matches.length > 0) {
      const best = [...matches].sort((a, b) => b.eloChange - a.eloChange)[0];
      records.highestEloGain = {
        matchId: best.id,
        value: best.eloChange,
        winners: best.winners.map((id) => players.find((p) => p.id === id)?.name || 'Unknown'),
      };
    }

    if (matches.length > 0) {
      const best = [...matches].sort((a, b) => (b.scoreWinner - b.scoreLoser) - (a.scoreWinner - a.scoreLoser))[0];
      records.mostDominantVictory = {
        matchId: best.id,
        score: `${best.scoreWinner}-${best.scoreLoser}`,
        margin: best.scoreWinner - best.scoreLoser,
        winners: best.winners.map((id) => players.find((p) => p.id === id)?.name || 'Unknown'),
      };
    }

    res.json(records);
  } catch (err) {
    console.error('Error in /api/hall-of-fame:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
