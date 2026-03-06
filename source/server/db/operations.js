import { supabase, isSupabaseEnabled } from '../../lib/supabase.js';
import { getDB, saveDB, seedData } from './persistence.js';
import { INITIAL_ELO, calculateMatchDelta } from '../services/elo.js';

const DEFAULT_ELO_CONFIG = {
  kFactor: 32,
  initialElo: 1200,
  dFactor: 200,
  formulaPreset: 'standard',
  customFormula: 'Math.round(kFactor * (1 - expectedScore(winnerElo, loserElo)))',
  customConstants: {},
};
import {
  toLegacyPlayer,
  toLegacyRacket,
  toLegacyMatch,
  batchToLegacyMatch,
  toLegacyEloHistory,
  toLegacyPendingMatch,
  batchToLegacyPendingMatch,
  toLegacySeason,
  toLegacyChallenge,
  toLegacyTournament,
  toLegacyReaction,
} from './mappers.js';

const db = () => getDB();

export const dbOps = {
  async getPlayers() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').select('*').order('elo_singles', { ascending: false });
      if (error) throw error;
      return data.map(toLegacyPlayer);
    }
    return db().players;
  },

  async getPlayerById(id) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').select('*').eq('id', id).single();
      if (error) return null;
      return toLegacyPlayer(data);
    }
    return db().players.find((p) => p.id === id) || null;
  },

  async getPlayerByUid(uid) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').select('*').eq('firebase_uid', uid).single();
      if (error) return null;
      return toLegacyPlayer(data);
    }
    return db().players.find((p) => p.uid === uid) || null;
  },

  async createPlayer(player) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('players')
        .insert({
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          bio: player.bio,
          elo_singles: player.eloSingles,
          elo_doubles: player.eloDoubles,
          wins_singles: player.winsSingles ?? 0,
          losses_singles: player.lossesSingles ?? 0,
          streak_singles: player.streakSingles ?? 0,
          wins_doubles: player.winsDoubles ?? 0,
          losses_doubles: player.lossesDoubles ?? 0,
          streak_doubles: player.streakDoubles ?? 0,
          joined_at: player.joinedAt,
          main_racket_id: player.mainRacketId,
          firebase_uid: player.uid,
        })
        .select()
        .single();
      if (error) throw error;
      return toLegacyPlayer(data);
    }
    db().players.push(player);
    await saveDB();
    return player;
  },

  async updatePlayer(id, updates) {
    if (isSupabaseEnabled()) {
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.eloSingles !== undefined) dbUpdates.elo_singles = updates.eloSingles;
      if (updates.eloDoubles !== undefined) dbUpdates.elo_doubles = updates.eloDoubles;
      if (updates.winsSingles !== undefined) dbUpdates.wins_singles = updates.winsSingles;
      if (updates.lossesSingles !== undefined) dbUpdates.losses_singles = updates.lossesSingles;
      if (updates.streakSingles !== undefined) dbUpdates.streak_singles = updates.streakSingles;
      if (updates.winsDoubles !== undefined) dbUpdates.wins_doubles = updates.winsDoubles;
      if (updates.lossesDoubles !== undefined) dbUpdates.losses_doubles = updates.lossesDoubles;
      if (updates.streakDoubles !== undefined) dbUpdates.streak_doubles = updates.streakDoubles;
      if (updates.mainRacketId !== undefined) dbUpdates.main_racket_id = updates.mainRacketId;
      if (updates.uid !== undefined) dbUpdates.firebase_uid = updates.uid;
      if (updates.leagueId !== undefined) dbUpdates.league_id = updates.leagueId;

      const { data, error } = await supabase.from('players').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacyPlayer(data);
    }
    const idx = db().players.findIndex((p) => p.id === id);
    if (idx !== -1) {
      db().players[idx] = { ...db().players[idx], ...updates };
      await saveDB();
      return db().players[idx];
    }
    return null;
  },

  async deletePlayer(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db().players = db().players.filter((p) => p.id !== id);
    await saveDB();
    return true;
  },

  async getRackets() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('rackets').select('*');
      if (error) throw error;
      return data.map(toLegacyRacket);
    }
    return db().rackets;
  },

  async createRacket(racket) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('rackets')
        .insert({
          id: racket.id,
          name: racket.name,
          icon: racket.icon,
          color: racket.color,
          stats: racket.stats,
          created_by: racket.createdBy,
        })
        .select()
        .single();
      if (error) throw error;
      return toLegacyRacket(data);
    }
    db().rackets.push(racket);
    await saveDB();
    return racket;
  },

  async updateRacket(id, updates) {
    if (isSupabaseEnabled()) {
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.stats !== undefined) dbUpdates.stats = updates.stats;

      const { data, error } = await supabase.from('rackets').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacyRacket(data);
    }
    const idx = db().rackets.findIndex((r) => r.id === id);
    if (idx !== -1) {
      db().rackets[idx] = { ...db().rackets[idx], ...updates };
      await saveDB();
      return db().rackets[idx];
    }
    return null;
  },

  async deleteRacket(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('rackets').delete().eq('id', id);
      if (error) throw error;
      await supabase.from('players').update({ main_racket_id: null }).eq('main_racket_id', id);
      return true;
    }
    db().rackets = db().rackets.filter((r) => r.id !== id);
    db().players = db().players.map((p) => (p.mainRacketId === id ? { ...p, mainRacketId: undefined } : p));
    await saveDB();
    return true;
  },

  async getMatches(limit = 100) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('matches')
        .select('*, match_players(player_id, is_winner)')
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map(batchToLegacyMatch);
    }
    return db().matches.slice(0, limit);
  },

  async getMatchesSince(timestamp) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('matches')
        .select('*, match_players(player_id, is_winner)')
        .gt('timestamp', timestamp)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data.map(batchToLegacyMatch);
    }
    return db().matches.filter((m) => new Date(m.timestamp) > new Date(timestamp));
  },

  async createMatch(match, winnerIds, loserIds, historyEntries) {
    if (isSupabaseEnabled()) {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          id: match.id,
          type: match.type,
          score_winner: match.scoreWinner,
          score_loser: match.scoreLoser,
          timestamp: match.timestamp,
          elo_change: match.eloChange,
          logged_by: match.loggedBy,
          is_friendly: match.isFriendly || false,
          league_id: match.leagueId || null,
          match_format: match.matchFormat || 'vintage21',
          season_id: match.seasonId || null,
        })
        .select()
        .single();
      if (matchError) throw matchError;

      const matchPlayers = [
        ...winnerIds.map((id) => ({ match_id: match.id, player_id: id, is_winner: true })),
        ...loserIds.map((id) => ({ match_id: match.id, player_id: id, is_winner: false })),
      ];
      const { error: mpError } = await supabase.from('match_players').insert(matchPlayers);
      if (mpError) throw mpError;

      if (historyEntries.length > 0) {
        const { error: ehError } = await supabase.from('elo_history').insert(
          historyEntries.map((h) => ({
            player_id: h.playerId,
            match_id: h.matchId,
            new_elo: h.newElo,
            timestamp: h.timestamp,
            game_type: h.gameType,
          }))
        );
        if (ehError) throw ehError;
      }

      return toLegacyMatch(matchData);
    }
    db().matches.unshift(match);
    db().history.push(...historyEntries);
    await saveDB();
    return match;
  },

  async deleteMatch(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const match = db().matches.find((m) => m.id === id);
    if (match) {
      db().matches = db().matches.filter((m) => m.id !== id);
      db().history = db().history.filter((h) => h.matchId !== match.id);
      await saveDB();
    }
    return true;
  },

  async getHistory(limit = 200) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('elo_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map(toLegacyEloHistory);
    }
    return db().history.slice(0, limit);
  },

  async getHistorySince(timestamp) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('elo_history')
        .select('*')
        .gt('timestamp', timestamp)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data.map(toLegacyEloHistory);
    }
    return db().history.filter((h) => new Date(h.timestamp) > new Date(timestamp));
  },

  async getAdmins() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('admins').select('*');
      if (error) throw error;
      return data.map((a) => ({
        id: a.id,
        firebaseUid: a.firebase_uid,
        createdAt: a.created_at,
      }));
    }
    return db().admins.map((uid, idx) => ({
      id: `admin-${idx}`,
      firebaseUid: uid,
      createdAt: new Date().toISOString(),
    }));
  },

  async addAdmin(uid) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('admins').insert({ firebase_uid: uid }).select().single();
      if (error && !error.message.includes('duplicate')) throw error;
      return data ? {
        id: data.id,
        firebaseUid: data.firebase_uid,
        createdAt: data.created_at,
      } : null;
    }
    if (!db().admins.includes(uid)) {
      db().admins.push(uid);
      await saveDB();
    }
    return { id: `admin-${db().admins.length}`, firebaseUid: uid, createdAt: new Date().toISOString() };
  },

  async removeAdmin(uid) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('admins').delete().eq('firebase_uid', uid);
      if (error) throw error;
      return true;
    }
    db().admins = db().admins.filter((a) => a !== uid);
    await saveDB();
    return true;
  },

  async getEloConfig() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'elo_config')
        .single();
      if (error || !data) return { ...DEFAULT_ELO_CONFIG };
      return { ...DEFAULT_ELO_CONFIG, ...data.value };
    }
    return { ...DEFAULT_ELO_CONFIG, ...(db().eloConfig || {}) };
  },

  async saveEloConfig(config) {
    const validPresets = ['standard', 'score_weighted', 'custom'];

    // Validate customConstants: keys must be safe identifiers, values must be numbers
    const rawConstants = config.customConstants ?? {};
    const safeConstants = {};
    const identifierRe = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    for (const [k, v] of Object.entries(rawConstants)) {
      if (!identifierRe.test(k)) throw new Error(`Invalid constant name: "${k}"`);
      const num = Number(v);
      if (!isFinite(num)) throw new Error(`Constant "${k}" must be a finite number`);
      safeConstants[k] = num;
    }

    const safeConfig = {
      kFactor: Math.max(1, Math.min(200, Number(config.kFactor) || 32)),
      initialElo: Math.max(100, Math.min(5000, Number(config.initialElo) || 1200)),
      dFactor: Math.max(50, Math.min(2000, Number(config.dFactor) || 200)),
      formulaPreset: validPresets.includes(config.formulaPreset) ? config.formulaPreset : 'standard',
      customFormula: typeof config.customFormula === 'string' ? config.customFormula.trim() : DEFAULT_ELO_CONFIG.customFormula,
      customConstants: safeConstants,
    };

    // Validate the custom formula with a dry-run if preset is 'custom'
    if (safeConfig.formulaPreset === 'custom') {
      const { validateCustomFormula } = await import('../services/elo.js');
      const err = validateCustomFormula(safeConfig.customFormula, safeConfig.customConstants);
      if (err) throw new Error(`Formula error: ${err}`);
    }
    if (isSupabaseEnabled()) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'elo_config', value: safeConfig, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else {
      db().eloConfig = safeConfig;
      await saveDB();
    }
    return safeConfig;
  },

  async recalculateElo() {
    const eloConfig = await this.getEloConfig();
    const startingElo = eloConfig.initialElo;

    const players = await this.getPlayers();
    const allMatches = await this.getMatches(999999);

    // Sort chronologically (oldest first)
    const sortedMatches = [...allMatches].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Initialize player state
    const playerMap = {};
    for (const p of players) {
      playerMap[p.id] = {
        id: p.id,
        eloSingles: startingElo,
        eloDoubles: startingElo,
        winsSingles: 0, lossesSingles: 0, streakSingles: 0,
        winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
      };
    }

    const newHistoryEntries = [];
    const matchDeltas = {};

    for (const match of sortedMatches) {
      if (match.isFriendly) continue;

      const { winners, losers, type, id: matchId, timestamp, scoreWinner, scoreLoser } = match;
      const isSingles = type === 'singles';

      let wElo, lElo;
      if (isSingles) {
        wElo = playerMap[winners[0]]?.eloSingles ?? startingElo;
        lElo = playerMap[losers[0]]?.eloSingles ?? startingElo;
      } else {
        wElo = ((playerMap[winners[0]]?.eloDoubles ?? startingElo) + (playerMap[winners[1]]?.eloDoubles ?? startingElo)) / 2;
        lElo = ((playerMap[losers[0]]?.eloDoubles ?? startingElo) + (playerMap[losers[1]]?.eloDoubles ?? startingElo)) / 2;
      }

      const delta = Math.round(calculateMatchDelta(wElo, lElo, { ...eloConfig, scoreWinner, scoreLoser }));
      matchDeltas[matchId] = delta;

      for (const winnerId of winners) {
        const p = playerMap[winnerId];
        if (!p) continue;
        const eloKey = isSingles ? 'eloSingles' : 'eloDoubles';
        const streakKey = isSingles ? 'streakSingles' : 'streakDoubles';
        const winsKey = isSingles ? 'winsSingles' : 'winsDoubles';
        p[eloKey] += delta;
        p[winsKey]++;
        p[streakKey] = p[streakKey] >= 0 ? p[streakKey] + 1 : 1;
        newHistoryEntries.push({ playerId: winnerId, matchId, newElo: p[eloKey], timestamp, gameType: type });
      }

      for (const loserId of losers) {
        const p = playerMap[loserId];
        if (!p) continue;
        const eloKey = isSingles ? 'eloSingles' : 'eloDoubles';
        const streakKey = isSingles ? 'streakSingles' : 'streakDoubles';
        const lossesKey = isSingles ? 'lossesSingles' : 'lossesDoubles';
        p[eloKey] -= delta;
        p[lossesKey]++;
        p[streakKey] = p[streakKey] <= 0 ? p[streakKey] - 1 : -1;
        newHistoryEntries.push({ playerId: loserId, matchId, newElo: p[eloKey], timestamp, gameType: type });
      }
    }

    const matchesReplayed = Object.keys(matchDeltas).length;

    if (isSupabaseEnabled()) {
      for (const p of Object.values(playerMap)) {
        const { error } = await supabase.from('players').update({
          elo_singles: p.eloSingles,
          elo_doubles: p.eloDoubles,
          wins_singles: p.winsSingles,
          losses_singles: p.lossesSingles,
          streak_singles: p.streakSingles,
          wins_doubles: p.winsDoubles,
          losses_doubles: p.lossesDoubles,
          streak_doubles: p.streakDoubles,
        }).eq('id', p.id);
        if (error) throw error;
      }

      for (const [matchId, delta] of Object.entries(matchDeltas)) {
        await supabase.from('matches').update({ elo_change: delta }).eq('id', matchId);
      }

      await supabase.from('elo_history').delete().gte('timestamp', '1900-01-01T00:00:00Z');
      if (newHistoryEntries.length > 0) {
        const { error } = await supabase.from('elo_history').insert(
          newHistoryEntries.map(h => ({
            player_id: h.playerId,
            match_id: h.matchId,
            new_elo: h.newElo,
            timestamp: h.timestamp,
            game_type: h.gameType,
          }))
        );
        if (error) throw error;
      }
    } else {
      for (const p of Object.values(playerMap)) {
        const idx = db().players.findIndex(pl => pl.id === p.id);
        if (idx !== -1) db().players[idx] = { ...db().players[idx], ...p };
      }
      for (const [matchId, delta] of Object.entries(matchDeltas)) {
        const mIdx = db().matches.findIndex(m => m.id === matchId);
        if (mIdx !== -1) db().matches[mIdx].eloChange = delta;
      }
      db().history = newHistoryEntries;
      await saveDB();
    }

    return { playersUpdated: Object.keys(playerMap).length, matchesReplayed };
  },

  async getAdminStats() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('admin_stats').select('*').single();
      if (error) {
        // Fallback: calculate manually
        const [players, matches, seasons, leagues, pendingMatches, admins] = await Promise.all([
          this.getPlayers(),
          this.getMatches(999999),
          this.getSeasons(),
          this.getLeagues(),
          this.getPendingMatches(),
          this.getAdmins(),
        ]);
        return {
          totalPlayers: players.length,
          totalMatches: matches.length,
          activeSeasons: seasons.filter(s => s.status === 'active').length,
          completedSeasons: seasons.filter(s => s.status === 'completed').length,
          totalLeagues: leagues.length,
          pendingMatches: pendingMatches.filter(pm => pm.status === 'pending').length,
          pendingCorrections: 0, // TODO: implement correction requests
          totalAdmins: admins.length,
        };
      }
      return {
        totalPlayers: data.total_players,
        totalMatches: data.total_matches,
        activeSeasons: data.active_seasons,
        completedSeasons: data.completed_seasons,
        totalLeagues: data.total_leagues,
        pendingMatches: data.pending_matches,
        pendingCorrections: data.pending_corrections,
        totalAdmins: data.total_admins,
      };
    }
    return {
      totalPlayers: db().players.length,
      totalMatches: db().matches.length,
      activeSeasons: db().seasons.filter(s => s.status === 'active').length,
      completedSeasons: db().seasons.filter(s => s.status === 'completed').length,
      totalLeagues: (db().leagues || []).length,
      pendingMatches: db().pendingMatches.filter(pm => pm.status === 'pending').length,
      pendingCorrections: 0,
      totalAdmins: db().admins.length,
    };
  },

  async archiveSeasonMatches(seasonId) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.rpc('archive_season_matches', { p_season_id: seasonId });
      if (error) throw error;
      return true;
    }
    // For local JSON, we don't archive - just keep matches
    return true;
  },

  async deleteSeason(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('seasons').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db().seasons = db().seasons.filter((s) => s.id !== id);
    await saveDB();
    return true;
  },

  async getPendingMatches() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('pending_matches')
        .select('*, pending_match_players(player_id, is_winner)')
        .neq('status', 'confirmed');
      if (error) throw error;
      return data.map(batchToLegacyPendingMatch);
    }
    return db().pendingMatches;
  },

  async createPendingMatch(pm, winnerIds, loserIds) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('pending_matches')
        .insert({
          id: pm.id,
          type: pm.type,
          score_winner: pm.scoreWinner,
          score_loser: pm.scoreLoser,
          logged_by: pm.loggedBy,
          status: pm.status,
          confirmations: pm.confirmations,
          created_at: pm.createdAt,
          expires_at: pm.expiresAt,
        })
        .select()
        .single();
      if (error) throw error;

      const matchPlayers = [
        ...winnerIds.map((id) => ({ pending_match_id: pm.id, player_id: id, is_winner: true })),
        ...loserIds.map((id) => ({ pending_match_id: pm.id, player_id: id, is_winner: false })),
      ];
      await supabase.from('pending_match_players').insert(matchPlayers);

      return toLegacyPendingMatch(data);
    }
    db().pendingMatches.push(pm);
    await saveDB();
    return pm;
  },

  async updatePendingMatch(id, updates) {
    if (isSupabaseEnabled()) {
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.confirmations !== undefined) dbUpdates.confirmations = updates.confirmations;

      const { data, error } = await supabase.from('pending_matches').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacyPendingMatch(data);
    }
    const idx = db().pendingMatches.findIndex((m) => m.id === id);
    if (idx !== -1) {
      db().pendingMatches[idx] = { ...db().pendingMatches[idx], ...updates };
      await saveDB();
      return db().pendingMatches[idx];
    }
    return null;
  },

  async deletePendingMatch(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('pending_matches').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db().pendingMatches = db().pendingMatches.filter((m) => m.id !== id);
    await saveDB();
    return true;
  },

  async getSeasons() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('seasons').select('*').order('number', { ascending: false });
      if (error) throw error;
      return data.map(toLegacySeason);
    }
    return db().seasons;
  },

  async createSeason(season) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('seasons')
        .insert({
          id: season.id,
          name: season.name,
          number: season.number,
          status: season.status,
          started_at: season.startedAt,
          final_standings: season.finalStandings,
          match_count: season.matchCount,
          champion_id: season.championId,
        })
        .select()
        .single();
      if (error) throw error;
      return toLegacySeason(data);
    }
    db().seasons.push(season);
    await saveDB();
    return season;
  },

  async updateSeason(id, updates) {
    if (isSupabaseEnabled()) {
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.endedAt !== undefined) dbUpdates.ended_at = updates.endedAt;
      if (updates.finalStandings !== undefined) dbUpdates.final_standings = updates.finalStandings;
      if (updates.matchCount !== undefined) dbUpdates.match_count = updates.matchCount;
      if (updates.championId !== undefined) dbUpdates.champion_id = updates.championId;

      const { data, error } = await supabase.from('seasons').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacySeason(data);
    }
    const idx = db().seasons.findIndex((s) => s.id === id);
    if (idx !== -1) {
      db().seasons[idx] = { ...db().seasons[idx], ...updates };
      await saveDB();
      return db().seasons[idx];
    }
    return null;
  },

  async getChallenges(limit = 50) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map(toLegacyChallenge);
    }
    return db().challenges.slice(0, limit);
  },

  async createChallenge(challenge) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          id: challenge.id,
          challenger_id: challenge.challengerId,
          challenged_id: challenge.challengedId,
          status: challenge.status,
          wager: challenge.wager,
          message: challenge.message,
          match_id: challenge.matchId,
          created_at: challenge.createdAt,
        })
        .select()
        .single();
      if (error) throw error;
      return toLegacyChallenge(data);
    }
    db().challenges.push(challenge);
    await saveDB();
    return challenge;
  },

  async updateChallenge(id, updates) {
    if (isSupabaseEnabled()) {
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.matchId !== undefined) dbUpdates.match_id = updates.matchId;

      const { data, error } = await supabase.from('challenges').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacyChallenge(data);
    }
    const idx = db().challenges.findIndex((c) => c.id === id);
    if (idx !== -1) {
      db().challenges[idx] = { ...db().challenges[idx], ...updates };
      await saveDB();
      return db().challenges[idx];
    }
    return null;
  },

  async deleteChallenge(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db().challenges = db().challenges.filter((c) => c.id !== id);
    await saveDB();
    return true;
  },

  async getTournaments(limit = 20) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map(toLegacyTournament);
    }
    return db().tournaments.slice(0, limit);
  },

  async createTournament(tournament) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          status: tournament.status,
          game_type: tournament.gameType,
          player_ids: tournament.playerIds,
          rounds: tournament.rounds,
          created_by: tournament.createdBy,
          winner_id: tournament.winnerId,
          created_at: tournament.createdAt,
          completed_at: tournament.completedAt,
        })
        .select()
        .single();
      if (error) throw error;
      return toLegacyTournament(data);
    }
    db().tournaments.push(tournament);
    await saveDB();
    return tournament;
  },

  async updateTournament(id, updates) {
    if (isSupabaseEnabled()) {
      const dbUpdates = {};
      if (updates.rounds !== undefined) dbUpdates.rounds = updates.rounds;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.winnerId !== undefined) dbUpdates.winner_id = updates.winnerId;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.playerIds !== undefined) dbUpdates.player_ids = updates.playerIds;

      const { data, error } = await supabase.from('tournaments').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacyTournament(data);
    }
    const idx = db().tournaments.findIndex((t) => t.id === id);
    if (idx !== -1) {
      db().tournaments[idx] = { ...db().tournaments[idx], ...updates };
      await saveDB();
      return db().tournaments[idx];
    }
    return null;
  },

  async deleteTournament(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db().tournaments = db().tournaments.filter((t) => t.id !== id);
    await saveDB();
    return true;
  },

  async getReactions() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('match_reactions').select('*');
      if (error) throw error;
      return data.map(toLegacyReaction);
    }
    return db().reactions;
  },

  async getFullState(options = {}) {
    const {
      matchesLimit = 100,
      historyLimit = 200,
      challengesLimit = 50,
      tournamentsLimit = 20,
    } = options;

    if (isSupabaseEnabled()) {
      const [players, matches, history, rackets, pendingMatches, seasons, challenges, tournaments, reactions, leagues] =
        await Promise.all([
          this.getPlayers(),
          this.getMatches(matchesLimit),
          this.getHistory(historyLimit),
          this.getRackets(),
          this.getPendingMatches(),
          this.getSeasons(),
          this.getChallenges(challengesLimit),
          this.getTournaments(tournamentsLimit),
          this.getReactions(),
          this.getLeagues(),
        ]);
      return { players, matches, history, rackets, pendingMatches, seasons, challenges, tournaments, reactions, leagues };
    }
    return {
      players: db().players,
      matches: db().matches,
      history: db().history,
      rackets: db().rackets,
      pendingMatches: db().pendingMatches,
      seasons: db().seasons,
      challenges: db().challenges,
      tournaments: db().tournaments,
      reactions: db().reactions,
      leagues: db().leagues || [],
    };
  },

  async resetPlayers(updates) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase
        .from('players')
        .update({
          elo_singles: updates.eloSingles,
          elo_doubles: updates.eloDoubles,
          wins_singles: updates.winsSingles ?? 0,
          losses_singles: updates.lossesSingles ?? 0,
          streak_singles: updates.streakSingles ?? 0,
          wins_doubles: updates.winsDoubles ?? 0,
          losses_doubles: updates.lossesDoubles ?? 0,
          streak_doubles: updates.streakDoubles ?? 0,
        })
        .neq('id', '');
      if (error) throw error;
      return true;
    }
    db().players = db().players.map((p) => ({ ...p, ...updates }));
    await saveDB();
    return true;
  },

  async clearMatches() {
    if (isSupabaseEnabled()) {
      await supabase.from('elo_history').delete().neq('id', '');
      await supabase.from('match_players').delete().neq('id', '');
      await supabase.from('matches').delete().neq('id', '');
      return true;
    }
    db().matches = [];
    db().history = [];
    await saveDB();
    return true;
  },

  async clearAllData() {
    if (isSupabaseEnabled()) {
      const tables = [
        'match_reactions', 'tournaments', 'challenges', 'seasons',
        'pending_match_players', 'pending_matches', 'admins',
        'elo_history', 'match_players', 'matches', 'players', 'rackets', 'leagues'
      ];
      for (const table of tables) {
        await supabase.from(table).delete().neq('id', '');
      }
      return true;
    }
    const d = getDB();
    d.players = [];
    d.matches = [];
    d.history = [];
    d.rackets = [];
    d.backups = [];
    d.admins = [];
    d.pendingMatches = [];
    d.seasons = [];
    d.challenges = [];
    d.tournaments = [];
    d.reactions = [];
    d.leagues = [];
    await saveDB();
    return true;
  },

  async getLeagues() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        createdBy: l.created_by,
        createdAt: l.created_at,
      }));
    }
    return db().leagues || [];
  },

  async getLeagueById(id) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('leagues').select('*').eq('id', id).single();
      if (error) throw error;
      return data ? {
        id: data.id,
        name: data.name,
        description: data.description,
        createdBy: data.created_by,
        createdAt: data.created_at,
      } : null;
    }
    return (db().leagues || []).find((l) => l.id === id) || null;
  },

  async createLeague(league) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          id: league.id,
          name: league.name,
          description: league.description || null,
          created_by: league.createdBy,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };
    }
    if (!db().leagues) db().leagues = [];
    const newLeague = { ...league, createdAt: new Date().toISOString() };
    db().leagues.push(newLeague);
    await saveDB();
    return newLeague;
  },

  async updateLeague(id, updates) {
    if (isSupabaseEnabled()) {
      const updateObj = {};
      if (updates.name !== undefined) updateObj.name = updates.name;
      if (updates.description !== undefined) updateObj.description = updates.description;
      const { data, error } = await supabase.from('leagues').update(updateObj).eq('id', id).select().single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };
    }
    if (!db().leagues) db().leagues = [];
    const idx = db().leagues.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('League not found');
    db().leagues[idx] = { ...db().leagues[idx], ...updates };
    await saveDB();
    return db().leagues[idx];
  },

  async deleteLeague(id) {
    if (isSupabaseEnabled()) {
      await supabase.from('players').update({ league_id: null }).eq('league_id', id);
      await supabase.from('matches').update({ league_id: null }).eq('league_id', id);
      const { error } = await supabase.from('leagues').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    if (!db().leagues) db().leagues = [];
    db().leagues = db().leagues.filter((l) => l.id !== id);
    db().players = db().players.map((p) => (p.leagueId === id ? { ...p, leagueId: null } : p));
    db().matches = db().matches.map((m) => (m.leagueId === id ? { ...m, leagueId: null } : m));
    await saveDB();
    return true;
  },

  async assignPlayerLeague(playerId, leagueId) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('players').update({ league_id: leagueId }).eq('id', playerId);
      if (error) throw error;
      return true;
    }
    const idx = db().players.findIndex((p) => p.id === playerId);
    if (idx === -1) throw new Error('Player not found');
    db().players[idx].leagueId = leagueId;
    await saveDB();
    return true;
  },
};
