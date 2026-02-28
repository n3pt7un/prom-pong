import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { dbOps } from '../db/operations.js';
import { isSupabaseEnabled } from '../../lib/supabase.js';
import { supabase } from '../../lib/supabase.js';

const router = Router();

// POST /api/corrections — submit a correction request
router.post('/corrections', authMiddleware, async (req, res) => {
  try {
    const { matchId, proposedWinners, proposedLosers, proposedScoreWinner, proposedScoreLoser, reason } = req.body;

    if (!matchId || !Array.isArray(proposedWinners) || !Array.isArray(proposedLosers)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const matches = await dbOps.getMatches();
    const match = matches.find(m => m.id === matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const players = await dbOps.getPlayers();
    const callerPlayer = players.find(p => p.uid === req.user.uid);
    if (!callerPlayer) return res.status(403).json({ error: 'You need a player profile' });

    const allMatchPlayers = [...match.winners, ...match.losers];
    if (!allMatchPlayers.includes(callerPlayer.id)) {
      return res.status(403).json({ error: 'Only match participants can request corrections' });
    }

    const id = `cr_${Date.now()}`;
    const request = {
      id,
      matchId,
      requestedBy: req.user.uid,
      proposedWinners,
      proposedLosers,
      proposedScoreWinner,
      proposedScoreLoser,
      reason: reason || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseEnabled() && supabase) {
      await supabase.from('correction_requests').insert({
        id: request.id,
        match_id: matchId,
        requested_by: req.user.uid,
        proposed_score_winner: proposedScoreWinner,
        proposed_score_loser: proposedScoreLoser,
        reason: reason || null,
        status: 'pending',
        created_at: request.createdAt,
      });
      const playerRows = [
        ...proposedWinners.map(pid => ({ request_id: id, player_id: pid, is_winner: true })),
        ...proposedLosers.map(pid => ({ request_id: id, player_id: pid, is_winner: false })),
      ];
      await supabase.from('correction_request_players').insert(playerRows);
    }

    res.json(request);
  } catch (err) {
    console.error('POST /api/corrections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/corrections — list all (admin only)
router.get('/corrections', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    if (!isSupabaseEnabled() || !supabase) {
      return res.json([]);
    }

    const { data: requests, error: reqErr } = await supabase
      .from('correction_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (reqErr) throw reqErr;

    const { data: playerRows, error: pErr } = await supabase
      .from('correction_request_players')
      .select('*');
    if (pErr) throw pErr;

    const result = requests.map(r => ({
      id: r.id,
      matchId: r.match_id,
      requestedBy: r.requested_by,
      proposedWinners: playerRows.filter(p => p.request_id === r.id && p.is_winner).map(p => p.player_id),
      proposedLosers: playerRows.filter(p => p.request_id === r.id && !p.is_winner).map(p => p.player_id),
      proposedScoreWinner: r.proposed_score_winner,
      proposedScoreLoser: r.proposed_score_loser,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /api/corrections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/corrections/:id/approve — admin approves
router.patch('/corrections/:id/approve', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    if (!isSupabaseEnabled() || !supabase) {
      return res.status(501).json({ error: 'Only supported in Supabase mode' });
    }

    const { data: rows } = await supabase
      .from('correction_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!rows) return res.status(404).json({ error: 'Request not found' });
    if (rows.status !== 'pending') return res.status(400).json({ error: 'Request already resolved' });

    const { data: playerRows } = await supabase
      .from('correction_request_players')
      .select('*')
      .eq('request_id', req.params.id);

    const proposedWinners = playerRows.filter(p => p.is_winner).map(p => p.player_id);
    const proposedLosers = playerRows.filter(p => !p.is_winner).map(p => p.player_id);

    const matches = await dbOps.getMatches();
    const match = matches.find(m => m.id === rows.match_id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    await supabase.from('correction_requests').update({
      status: 'approved',
      reviewed_by: req.user.uid,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    // Apply edit via internal fetch
    await fetch(`http://localhost:${process.env.PORT || 3001}/api/matches/${rows.match_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-admin': process.env.INTERNAL_SECRET || 'internal',
      },
      body: JSON.stringify({
        winners: proposedWinners,
        losers: proposedLosers,
        scoreWinner: rows.proposed_score_winner,
        scoreLoser: rows.proposed_score_loser,
      }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/corrections/:id/approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/corrections/:id/reject — admin rejects
router.patch('/corrections/:id/reject', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    if (isSupabaseEnabled() && supabase) {
      await supabase.from('correction_requests').update({
        status: 'rejected',
        reviewed_by: req.user.uid,
        reviewed_at: new Date().toISOString(),
      }).eq('id', req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/corrections/:id/reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
