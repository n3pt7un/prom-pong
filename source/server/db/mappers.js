import { supabase } from '../../lib/supabase.ts';

const INITIAL_ELO = 1200;

export const toLegacyPlayer = (p) => ({
  id: p.id,
  name: p.name,
  avatar: p.avatar,
  bio: p.bio,
  eloSingles: p.elo_singles ?? INITIAL_ELO,
  eloDoubles: p.elo_doubles ?? INITIAL_ELO,
  winsSingles: p.wins_singles ?? 0,
  lossesSingles: p.losses_singles ?? 0,
  streakSingles: p.streak_singles ?? 0,
  winsDoubles: p.wins_doubles ?? 0,
  lossesDoubles: p.losses_doubles ?? 0,
  streakDoubles: p.streak_doubles ?? 0,
  wins: (p.wins_singles ?? 0) + (p.wins_doubles ?? 0),
  losses: (p.losses_singles ?? 0) + (p.losses_doubles ?? 0),
  streak: Math.max(p.streak_singles ?? 0, p.streak_doubles ?? 0),
  joinedAt: p.joined_at,
  mainRacketId: p.main_racket_id,
  uid: p.firebase_uid,
  leagueId: p.league_id || null,
});

export const toLegacyRacket = (r) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  stats: r.stats,
  createdBy: r.created_by,
});

export const toLegacyMatch = async (m) => {
  const { data: players } = await supabase
    .from('match_players')
    .select('player_id, is_winner')
    .eq('match_id', m.id);
  const winners = players?.filter((p) => p.is_winner).map((p) => p.player_id) || [];
  const losers = players?.filter((p) => !p.is_winner).map((p) => p.player_id) || [];
  return {
    id: m.id,
    type: m.type,
    winners,
    losers,
    scoreWinner: m.score_winner,
    scoreLoser: m.score_loser,
    timestamp: m.timestamp,
    eloChange: m.elo_change,
    loggedBy: m.logged_by,
    isFriendly: m.is_friendly || false,
    leagueId: m.league_id || null,
  };
};

export const toLegacyEloHistory = (h) => ({
  playerId: h.player_id,
  matchId: h.match_id,
  newElo: h.new_elo,
  timestamp: h.timestamp,
  gameType: h.game_type,
});

export const toLegacyPendingMatch = async (pm) => {
  const { data: players } = await supabase
    .from('pending_match_players')
    .select('player_id, is_winner')
    .eq('pending_match_id', pm.id);
  const winners = players?.filter((p) => p.is_winner).map((p) => p.player_id) || [];
  const losers = players?.filter((p) => !p.is_winner).map((p) => p.player_id) || [];
  return {
    id: pm.id,
    type: pm.type,
    winners,
    losers,
    scoreWinner: pm.score_winner,
    scoreLoser: pm.score_loser,
    loggedBy: pm.logged_by,
    status: pm.status,
    confirmations: pm.confirmations || [],
    createdAt: pm.created_at,
    expiresAt: pm.expires_at,
  };
};

export const toLegacySeason = (s) => ({
  id: s.id,
  name: s.name,
  number: s.number,
  status: s.status,
  startedAt: s.started_at,
  endedAt: s.ended_at,
  finalStandings: s.final_standings,
  matchCount: s.match_count,
  championId: s.champion_id,
});

export const toLegacyChallenge = (c) => ({
  id: c.id,
  challengerId: c.challenger_id,
  challengedId: c.challenged_id,
  status: c.status,
  wager: c.wager,
  message: c.message,
  matchId: c.match_id,
  createdAt: c.created_at,
});

export const toLegacyTournament = (t) => ({
  id: t.id,
  name: t.name,
  format: t.format,
  status: t.status,
  gameType: t.game_type,
  playerIds: t.player_ids,
  rounds: t.rounds,
  createdBy: t.created_by,
  winnerId: t.winner_id,
  createdAt: t.created_at,
  completedAt: t.completed_at,
});

export const toLegacyReaction = (r) => ({
  id: r.id,
  matchId: r.match_id,
  playerId: r.player_id,
  emoji: r.emoji,
  comment: r.comment,
  createdAt: r.created_at,
});
