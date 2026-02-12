import { Router } from 'express';
import { dbOps } from '../db/operations.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateMatchDelta } from '../services/elo.js';
import { INITIAL_ELO } from '../services/elo.js';
import { isSupabaseEnabled } from '../../lib/supabase.ts';
import { supabase } from '../../lib/supabase.ts';

const router = Router();

router.post('/matches', authMiddleware, async (req, res) => {
  try {
    const { type, winners, losers, scoreWinner, scoreLoser, isFriendly } = req.body;

    if (!type || !['singles', 'doubles'].includes(type)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }
    if (!Array.isArray(winners) || !Array.isArray(losers)) {
      return res.status(400).json({ error: 'Winners and losers must be arrays' });
    }
    if (typeof scoreWinner !== 'number' || typeof scoreLoser !== 'number' || scoreWinner < 0 || scoreLoser < 0) {
      return res.status(400).json({ error: 'Scores must be non-negative numbers' });
    }

    const players = await dbOps.getPlayers();
    const getP = (id) => players.find((p) => p.id === id);

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    if (!isAdmin) {
      const callerPlayer = players.find((p) => p.uid === req.user.uid);
      if (!callerPlayer) {
        return res.status(403).json({ error: 'You need a player profile to log matches' });
      }
      const allParticipants = [...winners, ...losers];
      if (!allParticipants.includes(callerPlayer.id)) {
        return res.status(403).json({ error: 'You can only log matches where you are a participant' });
      }
    }

    const allIds = [...winners, ...losers];
    for (const id of allIds) {
      if (!getP(id)) {
        return res.status(400).json({ error: `Player with ID "${id}" not found` });
      }
    }

    const friendly = !!isFriendly;
    const timestamp = new Date().toISOString();
    const matchId = Date.now().toString();
    let delta = 0;
    const historyEntries = [];

    if (!friendly) {
      let wElo = 0, lElo = 0;
      if (type === 'singles') {
        if (!winners[0] || !losers[0]) {
          return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
        }
        wElo = getP(winners[0]).eloSingles;
        lElo = getP(losers[0]).eloSingles;
      } else {
        if (!winners[0] || !winners[1] || !losers[0] || !losers[1]) {
          return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
        }
        const w0 = getP(winners[0]);
        const w1 = getP(winners[1]);
        const l0 = getP(losers[0]);
        const l1 = getP(losers[1]);
        wElo = ((w0.eloDoubles ?? INITIAL_ELO) + (w1.eloDoubles ?? INITIAL_ELO)) / 2;
        lElo = ((l0.eloDoubles ?? INITIAL_ELO) + (l1.eloDoubles ?? INITIAL_ELO)) / 2;
      }
      delta = Math.round(calculateMatchDelta(wElo, lElo));

      for (const p of players) {
        if (winners.includes(p.id)) {
          const newElo = Math.round(type === 'singles' ? p.eloSingles + delta : p.eloDoubles + delta);
          historyEntries.push({ playerId: p.id, matchId, newElo, timestamp, gameType: type });
          const isSingles = type === 'singles';
          await dbOps.updatePlayer(p.id, {
            eloSingles: isSingles ? newElo : p.eloSingles,
            eloDoubles: !isSingles ? newElo : p.eloDoubles,
            winsSingles: isSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
            streakSingles: isSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
            winsDoubles: !isSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
            streakDoubles: !isSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
          });
        } else if (losers.includes(p.id)) {
          const newElo = Math.round(type === 'singles' ? p.eloSingles - delta : p.eloDoubles - delta);
          historyEntries.push({ playerId: p.id, matchId, newElo, timestamp, gameType: type });
          const isSingles = type === 'singles';
          await dbOps.updatePlayer(p.id, {
            eloSingles: isSingles ? newElo : p.eloSingles,
            eloDoubles: !isSingles ? newElo : p.eloDoubles,
            lossesSingles: isSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
            streakSingles: isSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
            lossesDoubles: !isSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
            streakDoubles: !isSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
          });
        }
      }
    } else {
      for (const p of players) {
        const isSingles = type === 'singles';
        if (winners.includes(p.id)) {
          await dbOps.updatePlayer(p.id, {
            winsSingles: isSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
            streakSingles: isSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
            winsDoubles: !isSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
            streakDoubles: !isSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
          });
        } else if (losers.includes(p.id)) {
          await dbOps.updatePlayer(p.id, {
            lossesSingles: isSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
            streakSingles: isSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
            lossesDoubles: !isSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
            streakDoubles: !isSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
          });
        }
      }
    }

    const leagueId = req.body.leagueId || null;
    const newMatch = {
      id: matchId, type, winners, losers,
      scoreWinner, scoreLoser, timestamp, eloChange: delta, loggedBy: req.user.uid,
      isFriendly: friendly,
      leagueId,
    };

    const created = await dbOps.createMatch(newMatch, winners, losers, historyEntries);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/matches/:id', authMiddleware, async (req, res) => {
  try {
    const matches = await dbOps.getMatches();
    const match = matches.find((m) => m.id === req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    const isCreator = match.loggedBy && match.loggedBy === req.user.uid;
    const matchAge = Date.now() - new Date(match.timestamp).getTime();
    const withinWindow = matchAge < 60000;

    if (!isAdmin && !(isCreator && withinWindow)) {
      return res.status(403).json({ error: 'Not authorized to edit this match' });
    }

    const { winners, losers, scoreWinner, scoreLoser } = req.body;

    if (!Array.isArray(winners) || !Array.isArray(losers)) {
      return res.status(400).json({ error: 'Winners and losers must be arrays' });
    }
    if (typeof scoreWinner !== 'number' || typeof scoreLoser !== 'number' || scoreWinner < 0 || scoreLoser < 0) {
      return res.status(400).json({ error: 'Scores must be non-negative numbers' });
    }

    const players = await dbOps.getPlayers();
    const getP = (id) => players.find((p) => p.id === id);

    const allIds = [...winners, ...losers];
    for (const id of allIds) {
      if (!getP(id)) {
        return res.status(400).json({ error: `Player with ID "${id}" not found` });
      }
    }

    const { type: oldType, winners: oldWinners, losers: oldLosers, eloChange: oldEloChange } = match;
    const oldIsSingles = oldType === 'singles';

    for (const p of players) {
      if (oldWinners.includes(p.id)) {
        const restoredElo = oldIsSingles ? p.eloSingles - oldEloChange : p.eloDoubles - oldEloChange;
        await dbOps.updatePlayer(p.id, {
          eloSingles: oldIsSingles ? restoredElo : p.eloSingles,
          eloDoubles: !oldIsSingles ? restoredElo : p.eloDoubles,
          winsSingles: oldIsSingles ? Math.max(0, (p.winsSingles || 0) - 1) : (p.winsSingles || 0),
          winsDoubles: !oldIsSingles ? Math.max(0, (p.winsDoubles || 0) - 1) : (p.winsDoubles || 0),
          streakSingles: oldIsSingles ? 0 : (p.streakSingles || 0),
          streakDoubles: !oldIsSingles ? 0 : (p.streakDoubles || 0),
        });
      } else if (oldLosers.includes(p.id)) {
        const restoredElo = oldIsSingles ? p.eloSingles + oldEloChange : p.eloDoubles + oldEloChange;
        await dbOps.updatePlayer(p.id, {
          eloSingles: oldIsSingles ? restoredElo : p.eloSingles,
          eloDoubles: !oldIsSingles ? restoredElo : p.eloDoubles,
          lossesSingles: oldIsSingles ? Math.max(0, (p.lossesSingles || 0) - 1) : (p.lossesSingles || 0),
          lossesDoubles: !oldIsSingles ? Math.max(0, (p.lossesDoubles || 0) - 1) : (p.lossesDoubles || 0),
          streakSingles: oldIsSingles ? 0 : (p.streakSingles || 0),
          streakDoubles: !oldIsSingles ? 0 : (p.streakDoubles || 0),
        });
      }
    }

    if (isSupabaseEnabled()) {
      await supabase.from('elo_history').delete().eq('match_id', match.id);
      await supabase.from('match_players').delete().eq('match_id', match.id);
    }

    const type = match.type;
    let wElo = 0, lElo = 0;

    if (type === 'singles') {
      if (!winners[0] || !losers[0]) {
        return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
      }
      const winner = await dbOps.getPlayerById(winners[0]);
      const loser = await dbOps.getPlayerById(losers[0]);
      if (!winner || !loser) return res.status(400).json({ error: 'Player not found' });
      wElo = winner.eloSingles;
      lElo = loser.eloSingles;
    } else {
      if (!winners[0] || !winners[1] || !losers[0] || !losers[1]) {
        return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
      }
      const w0 = await dbOps.getPlayerById(winners[0]);
      const w1 = await dbOps.getPlayerById(winners[1]);
      const l0 = await dbOps.getPlayerById(losers[0]);
      const l1 = await dbOps.getPlayerById(losers[1]);
      if (!w0 || !w1 || !l0 || !l1) return res.status(400).json({ error: 'Player not found' });
      wElo = (w0.eloDoubles + w1.eloDoubles) / 2;
      lElo = (l0.eloDoubles + l1.eloDoubles) / 2;
    }

    const newDelta = calculateMatchDelta(wElo, lElo);
    const newTimestamp = new Date().toISOString();
    const newHistoryEntries = [];

    const isSingles = type === 'singles';
    for (const p of players) {
      if (winners.includes(p.id)) {
        const newElo = isSingles ? p.eloSingles + newDelta : p.eloDoubles + newDelta;
        newHistoryEntries.push({ playerId: p.id, matchId: match.id, newElo, timestamp: newTimestamp, gameType: type });
        await dbOps.updatePlayer(p.id, {
          eloSingles: isSingles ? newElo : p.eloSingles,
          eloDoubles: !isSingles ? newElo : p.eloDoubles,
          winsSingles: isSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
          winsDoubles: !isSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
          streakSingles: isSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
          streakDoubles: !isSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
        });
      } else if (losers.includes(p.id)) {
        const newElo = isSingles ? p.eloSingles - newDelta : p.eloDoubles - newDelta;
        newHistoryEntries.push({ playerId: p.id, matchId: match.id, newElo, timestamp: newTimestamp, gameType: type });
        await dbOps.updatePlayer(p.id, {
          eloSingles: isSingles ? newElo : p.eloSingles,
          eloDoubles: !isSingles ? newElo : p.eloDoubles,
          lossesSingles: isSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
          lossesDoubles: !isSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
          streakSingles: isSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
          streakDoubles: !isSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
        });
      }
    }

    const updatedMatch = {
      ...match,
      winners,
      losers,
      scoreWinner,
      scoreLoser,
      eloChange: newDelta,
      timestamp: newTimestamp,
    };

    if (isSupabaseEnabled()) {
      await supabase.from('matches').update({
        score_winner: scoreWinner,
        score_loser: scoreLoser,
        elo_change: newDelta,
        timestamp: newTimestamp,
      }).eq('id', match.id);
      const matchPlayers = [
        ...winners.map((id) => ({ match_id: match.id, player_id: id, is_winner: true })),
        ...losers.map((id) => ({ match_id: match.id, player_id: id, is_winner: false })),
      ];
      await supabase.from('match_players').delete().eq('match_id', match.id);
      await supabase.from('match_players').insert(matchPlayers);
      for (const h of newHistoryEntries) {
        await supabase.from('elo_history').insert({
          player_id: h.playerId,
          match_id: h.matchId,
          new_elo: h.newElo,
          timestamp: h.timestamp,
          game_type: h.gameType,
        });
      }
    }

    res.json(updatedMatch);
  } catch (err) {
    console.error('Error in PUT /api/matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/matches/:id', authMiddleware, async (req, res) => {
  try {
    const matches = await dbOps.getMatches();
    const match = matches.find((m) => m.id === req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    const isCreator = match.loggedBy && match.loggedBy === req.user.uid;
    const matchAge = Date.now() - new Date(match.timestamp).getTime();
    const withinWindow = matchAge < 60000;

    if (!isAdmin && !(isCreator && withinWindow)) {
      return res.status(403).json({ error: 'Not authorized to delete this match' });
    }

    const players = await dbOps.getPlayers();
    const { type, winners, losers, eloChange } = match;
    const oldIsSingles = type === 'singles';

    for (const p of players) {
      if (winners.includes(p.id)) {
        const restoredElo = oldIsSingles ? p.eloSingles - eloChange : p.eloDoubles - eloChange;
        await dbOps.updatePlayer(p.id, {
          eloSingles: oldIsSingles ? restoredElo : p.eloSingles,
          eloDoubles: !oldIsSingles ? restoredElo : p.eloDoubles,
          winsSingles: oldIsSingles ? Math.max(0, (p.winsSingles || 0) - 1) : (p.winsSingles || 0),
          winsDoubles: !oldIsSingles ? Math.max(0, (p.winsDoubles || 0) - 1) : (p.winsDoubles || 0),
          streakSingles: oldIsSingles ? 0 : (p.streakSingles || 0),
          streakDoubles: !oldIsSingles ? 0 : (p.streakDoubles || 0),
        });
      } else if (losers.includes(p.id)) {
        const restoredElo = oldIsSingles ? p.eloSingles + eloChange : p.eloDoubles + eloChange;
        await dbOps.updatePlayer(p.id, {
          eloSingles: oldIsSingles ? restoredElo : p.eloSingles,
          eloDoubles: !oldIsSingles ? restoredElo : p.eloDoubles,
          lossesSingles: oldIsSingles ? Math.max(0, (p.lossesSingles || 0) - 1) : (p.lossesSingles || 0),
          lossesDoubles: !oldIsSingles ? Math.max(0, (p.lossesDoubles || 0) - 1) : (p.lossesDoubles || 0),
          streakSingles: oldIsSingles ? 0 : (p.streakSingles || 0),
          streakDoubles: !oldIsSingles ? 0 : (p.streakDoubles || 0),
        });
      }
    }

    if (isSupabaseEnabled()) {
      await supabase.from('elo_history').delete().eq('match_id', match.id);
      await supabase.from('match_players').delete().eq('match_id', match.id);
    }

    await dbOps.deleteMatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
