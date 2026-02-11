import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import admin from 'firebase-admin';
import { supabase, useSupabase, isSupabaseEnabled } from './lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Firebase Admin Setup ---
try {
  admin.initializeApp({
    // Uses Application Default Credentials on Cloud Run & local (gcloud auth application-default login)
  });
  console.log('🔐 Firebase Admin SDK initialized');
} catch (err) {
  console.error('⚠️ Firebase Admin SDK init failed:', err.message);
}

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'db.json');
const GCS_BUCKET = process.env.GCS_BUCKET;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Debug Middleware to log requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Static files (frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Google Cloud Storage
let storage = null;
let bucket = null;
if (GCS_BUCKET) {
  console.log(`☁️ GCS Bucket configured: ${GCS_BUCKET}`);
  storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET);
} else {
  console.log('💻 No GCS_BUCKET configured');
}

// Log database mode
if (isSupabaseEnabled()) {
  console.log('📊 Using Supabase PostgreSQL database');
} else if (GCS_BUCKET) {
  console.log('☁️ Using Google Cloud Storage (JSON file mode)');
} else {
  console.log('💻 Using local filesystem (JSON file mode)');
}

// --- ELO LOGIC ---
const K_FACTOR = 32;
const INITIAL_ELO = 1200;
const STAT_BUDGET = 30;

const getExpectedScore = (ratingA, ratingB) => 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
const calculateNewRating = (currentRating, actualScore, expectedScore) => Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
const calculateMatchDelta = (winnerElo, loserElo) => {
  const expectedWinner = getExpectedScore(winnerElo, loserElo);
  const newWinnerElo = calculateNewRating(winnerElo, 1, expectedWinner);
  return newWinnerElo - winnerElo;
};

// --- LEGACY DATA STORE (for JSON/GCS mode) ---
let db = {
  players: [],
  matches: [],
  history: [],
  rackets: [],
  backups: [],
  admins: [],
  pendingMatches: [],
  seasons: [],
  challenges: [],
  tournaments: [],
  reactions: [],
};

const seedData = () => {
  db.rackets = [
    { id: 'r1', name: 'Neon Striker', icon: 'Zap', color: '#fcee0a', stats: { speed: 18, spin: 5, power: 3, control: 2, defense: 1, chaos: 1 } },
    { id: 'r2', name: 'Cyber Wall', icon: 'Shield', color: '#00f3ff', stats: { speed: 2, spin: 3, power: 2, control: 5, defense: 18, chaos: 0 } },
    { id: 'r3', name: 'Void Smasher', icon: 'Target', color: '#ff00ff', stats: { speed: 3, spin: 2, power: 18, control: 3, defense: 3, chaos: 1 } },
  ];
  db.players = [
    { id: '1', name: 'Neo', avatar: "https://picsum.photos/id/64/200/200", eloSingles: 1450, eloDoubles: 1200, winsSingles: 10, lossesSingles: 1, streakSingles: 3, winsDoubles: 5, lossesDoubles: 1, streakDoubles: 2, joinedAt: new Date().toISOString(), mainRacketId: 'r1' },
    { id: '2', name: 'Trinity', avatar: "https://picsum.photos/id/65/200/200", eloSingles: 1380, eloDoubles: 1250, winsSingles: 8, lossesSingles: 3, streakSingles: 1, winsDoubles: 4, lossesDoubles: 2, streakDoubles: -1, joinedAt: new Date().toISOString(), mainRacketId: 'r2' },
  ];
  db.matches = [];
  db.history = [];
  db.backups = [];
  db.admins = [];
  db.pendingMatches = [];
  db.seasons = [];
  db.challenges = [];
  db.tournaments = [];
  db.reactions = [];
};

// --- LEGACY PERSISTENCE (for JSON/GCS mode) ---
const loadDB = async () => {
  try {
    if (bucket) {
      const file = bucket.file('db.json');
      const [exists] = await file.exists();
      if (exists) {
        const [contents] = await file.download();
        db = { ...db, ...JSON.parse(contents.toString()) };
        ensureArrayFields();
        console.log("✅ Database loaded from Cloud Storage");
      } else {
        seedData();
        await saveDB();
      }
    } else {
      if (fs.existsSync(DB_FILE)) {
        db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
        ensureArrayFields();
        if (db.players.length === 0) seedData();
        console.log("✅ Database loaded from local disk");
      } else {
        seedData();
        await saveDB();
      }
    }
  } catch (err) {
    console.error("❌ Error loading DB:", err);
    seedData();
  }
};

const ensureArrayFields = () => {
  if (!Array.isArray(db.admins)) db.admins = [];
  if (!Array.isArray(db.pendingMatches)) db.pendingMatches = [];
  if (!Array.isArray(db.seasons)) db.seasons = [];
  if (!Array.isArray(db.challenges)) db.challenges = [];
  if (!Array.isArray(db.tournaments)) db.tournaments = [];
  if (!Array.isArray(db.reactions)) db.reactions = [];
};

const saveDB = async () => {
  try {
    const data = JSON.stringify(db, null, 2);
    if (bucket) {
      await bucket.file('db.json').save(data, { contentType: 'application/json', resumable: false });
    } else {
      fs.writeFileSync(DB_FILE, data);
    }
  } catch (err) {
    console.error("❌ Error saving DB:", err);
  }
};

// --- SUPABASE DATABASE LAYER ---

// Helper to transform Supabase row to legacy format
const toLegacyPlayer = (p) => ({
  id: p.id,
  name: p.name,
  avatar: p.avatar,
  bio: p.bio,
  eloSingles: p.elo_singles ?? INITIAL_ELO,
  eloDoubles: p.elo_doubles ?? INITIAL_ELO,
  // Singles stats
  winsSingles: p.wins_singles ?? 0,
  lossesSingles: p.losses_singles ?? 0,
  streakSingles: p.streak_singles ?? 0,
  // Doubles stats
  winsDoubles: p.wins_doubles ?? 0,
  lossesDoubles: p.losses_doubles ?? 0,
  streakDoubles: p.streak_doubles ?? 0,
  // Legacy combined stats (backward compatibility)
  wins: (p.wins_singles ?? 0) + (p.wins_doubles ?? 0),
  losses: (p.losses_singles ?? 0) + (p.losses_doubles ?? 0),
  streak: Math.max(p.streak_singles ?? 0, p.streak_doubles ?? 0),
  joinedAt: p.joined_at,
  mainRacketId: p.main_racket_id,
  uid: p.firebase_uid,
  leagueId: p.league_id || null,
});

const toLegacyRacket = (r) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  stats: r.stats,
  createdBy: r.created_by,
});

const toLegacyMatch = async (m) => {
  // Get players for this match
  const { data: players } = await supabase
    .from('match_players')
    .select('player_id, is_winner')
    .eq('match_id', m.id);
  
  const winners = players?.filter(p => p.is_winner).map(p => p.player_id) || [];
  const losers = players?.filter(p => !p.is_winner).map(p => p.player_id) || [];
  
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

const toLegacyEloHistory = (h) => ({
  playerId: h.player_id,
  matchId: h.match_id,
  newElo: h.new_elo,
  timestamp: h.timestamp,
  gameType: h.game_type,
});

const toLegacyPendingMatch = async (pm) => {
  const { data: players } = await supabase
    .from('pending_match_players')
    .select('player_id, is_winner')
    .eq('pending_match_id', pm.id);
  
  const winners = players?.filter(p => p.is_winner).map(p => p.player_id) || [];
  const losers = players?.filter(p => !p.is_winner).map(p => p.player_id) || [];
  
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

const toLegacySeason = (s) => ({
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

const toLegacyChallenge = (c) => ({
  id: c.id,
  challengerId: c.challenger_id,
  challengedId: c.challenged_id,
  status: c.status,
  wager: c.wager,
  message: c.message,
  matchId: c.match_id,
  createdAt: c.created_at,
});

const toLegacyTournament = (t) => ({
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

const toLegacyReaction = (r) => ({
  id: r.id,
  matchId: r.match_id,
  playerId: r.player_id,
  emoji: r.emoji,
  comment: r.comment,
  createdAt: r.created_at,
});

// Database operations that work with either Supabase or JSON
const dbOps = {
  // Players
  async getPlayers() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').select('*').order('elo_singles', { ascending: false });
      if (error) throw error;
      return data.map(toLegacyPlayer);
    }
    return db.players;
  },
  
  async getPlayerById(id) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').select('*').eq('id', id).single();
      if (error) return null;
      return toLegacyPlayer(data);
    }
    return db.players.find(p => p.id === id) || null;
  },
  
  async getPlayerByUid(uid) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').select('*').eq('firebase_uid', uid).single();
      if (error) return null;
      return toLegacyPlayer(data);
    }
    return db.players.find(p => p.uid === uid) || null;
  },
  
  async createPlayer(player) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('players').insert({
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
      }).select().single();
      if (error) throw error;
      return toLegacyPlayer(data);
    }
    db.players.push(player);
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
      // Singles stats
      if (updates.winsSingles !== undefined) dbUpdates.wins_singles = updates.winsSingles;
      if (updates.lossesSingles !== undefined) dbUpdates.losses_singles = updates.lossesSingles;
      if (updates.streakSingles !== undefined) dbUpdates.streak_singles = updates.streakSingles;
      // Doubles stats
      if (updates.winsDoubles !== undefined) dbUpdates.wins_doubles = updates.winsDoubles;
      if (updates.lossesDoubles !== undefined) dbUpdates.losses_doubles = updates.lossesDoubles;
      if (updates.streakDoubles !== undefined) dbUpdates.streak_doubles = updates.streakDoubles;
      if (updates.mainRacketId !== undefined) dbUpdates.main_racket_id = updates.mainRacketId;
      if (updates.uid !== undefined) dbUpdates.firebase_uid = updates.uid;
      
      const { data, error } = await supabase.from('players').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return toLegacyPlayer(data);
    }
    const idx = db.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      db.players[idx] = { ...db.players[idx], ...updates };
      await saveDB();
      return db.players[idx];
    }
    return null;
  },
  
  async deletePlayer(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db.players = db.players.filter(p => p.id !== id);
    await saveDB();
    return true;
  },
  
  // Rackets
  async getRackets() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('rackets').select('*');
      if (error) throw error;
      return data.map(toLegacyRacket);
    }
    return db.rackets;
  },
  
  async createRacket(racket) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('rackets').insert({
        id: racket.id,
        name: racket.name,
        icon: racket.icon,
        color: racket.color,
        stats: racket.stats,
        created_by: racket.createdBy,
      }).select().single();
      if (error) throw error;
      return toLegacyRacket(data);
    }
    db.rackets.push(racket);
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
    const idx = db.rackets.findIndex(r => r.id === id);
    if (idx !== -1) {
      db.rackets[idx] = { ...db.rackets[idx], ...updates };
      await saveDB();
      return db.rackets[idx];
    }
    return null;
  },
  
  async deleteRacket(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('rackets').delete().eq('id', id);
      if (error) throw error;
      // Update players who had this as main racket
      await supabase.from('players').update({ main_racket_id: null }).eq('main_racket_id', id);
      return true;
    }
    db.rackets = db.rackets.filter(r => r.id !== id);
    db.players = db.players.map(p => p.mainRacketId === id ? { ...p, mainRacketId: undefined } : p);
    await saveDB();
    return true;
  },
  
  // Matches
  async getMatches() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('matches').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return Promise.all(data.map(toLegacyMatch));
    }
    return db.matches;
  },
  
  async createMatch(match, winnerIds, loserIds, historyEntries) {
    if (isSupabaseEnabled()) {
      // Insert match
      const { data: matchData, error: matchError } = await supabase.from('matches').insert({
        id: match.id,
        type: match.type,
        score_winner: match.scoreWinner,
        score_loser: match.scoreLoser,
        timestamp: match.timestamp,
        elo_change: match.eloChange,
        logged_by: match.loggedBy,
        is_friendly: match.isFriendly || false,
        league_id: match.leagueId || null,
      }).select().single();
      if (matchError) throw matchError;
      
      // Insert match_players
      const matchPlayers = [
        ...winnerIds.map(id => ({ match_id: match.id, player_id: id, is_winner: true })),
        ...loserIds.map(id => ({ match_id: match.id, player_id: id, is_winner: false })),
      ];
      const { error: mpError } = await supabase.from('match_players').insert(matchPlayers);
      if (mpError) throw mpError;
      
      // Insert elo_history
      if (historyEntries.length > 0) {
        const { error: ehError } = await supabase.from('elo_history').insert(
          historyEntries.map(h => ({
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
    db.matches.unshift(match);
    db.history.push(...historyEntries);
    await saveDB();
    return match;
  },
  
  async deleteMatch(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const match = db.matches.find(m => m.id === id);
    if (match) {
      db.matches = db.matches.filter(m => m.id !== id);
      db.history = db.history.filter(h => h.matchId !== match.timestamp);
      await saveDB();
    }
    return true;
  },
  
  // History
  async getHistory() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('elo_history').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return data.map(toLegacyEloHistory);
    }
    return db.history;
  },
  
  // Admins
  async getAdmins() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('admins').select('firebase_uid');
      if (error) throw error;
      return data.map(a => a.firebase_uid);
    }
    return db.admins;
  },
  
  async addAdmin(uid) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('admins').insert({ firebase_uid: uid });
      if (error && !error.message.includes('duplicate')) throw error;
      return true;
    }
    if (!db.admins.includes(uid)) {
      db.admins.push(uid);
      await saveDB();
    }
    return true;
  },
  
  async removeAdmin(uid) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('admins').delete().eq('firebase_uid', uid);
      if (error) throw error;
      return true;
    }
    db.admins = db.admins.filter(a => a !== uid);
    await saveDB();
    return true;
  },
  
  // Pending Matches
  async getPendingMatches() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('pending_matches').select('*').neq('status', 'confirmed');
      if (error) throw error;
      return Promise.all(data.map(toLegacyPendingMatch));
    }
    return db.pendingMatches;
  },
  
  async createPendingMatch(pm, winnerIds, loserIds) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('pending_matches').insert({
        id: pm.id,
        type: pm.type,
        score_winner: pm.scoreWinner,
        score_loser: pm.scoreLoser,
        logged_by: pm.loggedBy,
        status: pm.status,
        confirmations: pm.confirmations,
        created_at: pm.createdAt,
        expires_at: pm.expiresAt,
      }).select().single();
      if (error) throw error;
      
      const matchPlayers = [
        ...winnerIds.map(id => ({ pending_match_id: pm.id, player_id: id, is_winner: true })),
        ...loserIds.map(id => ({ pending_match_id: pm.id, player_id: id, is_winner: false })),
      ];
      await supabase.from('pending_match_players').insert(matchPlayers);
      
      return toLegacyPendingMatch(data);
    }
    db.pendingMatches.push(pm);
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
    const idx = db.pendingMatches.findIndex(m => m.id === id);
    if (idx !== -1) {
      db.pendingMatches[idx] = { ...db.pendingMatches[idx], ...updates };
      await saveDB();
      return db.pendingMatches[idx];
    }
    return null;
  },
  
  async deletePendingMatch(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('pending_matches').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db.pendingMatches = db.pendingMatches.filter(m => m.id !== id);
    await saveDB();
    return true;
  },
  
  // Seasons
  async getSeasons() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('seasons').select('*').order('number', { ascending: false });
      if (error) throw error;
      return data.map(toLegacySeason);
    }
    return db.seasons;
  },
  
  async createSeason(season) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('seasons').insert({
        id: season.id,
        name: season.name,
        number: season.number,
        status: season.status,
        started_at: season.startedAt,
        final_standings: season.finalStandings,
        match_count: season.matchCount,
        champion_id: season.championId,
      }).select().single();
      if (error) throw error;
      return toLegacySeason(data);
    }
    db.seasons.push(season);
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
    const idx = db.seasons.findIndex(s => s.id === id);
    if (idx !== -1) {
      db.seasons[idx] = { ...db.seasons[idx], ...updates };
      await saveDB();
      return db.seasons[idx];
    }
    return null;
  },
  
  // Challenges
  async getChallenges() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toLegacyChallenge);
    }
    return db.challenges;
  },
  
  async createChallenge(challenge) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('challenges').insert({
        id: challenge.id,
        challenger_id: challenge.challengerId,
        challenged_id: challenge.challengedId,
        status: challenge.status,
        wager: challenge.wager,
        message: challenge.message,
        match_id: challenge.matchId,
        created_at: challenge.createdAt,
      }).select().single();
      if (error) throw error;
      return toLegacyChallenge(data);
    }
    db.challenges.push(challenge);
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
    const idx = db.challenges.findIndex(c => c.id === id);
    if (idx !== -1) {
      db.challenges[idx] = { ...db.challenges[idx], ...updates };
      await saveDB();
      return db.challenges[idx];
    }
    return null;
  },
  
  async deleteChallenge(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db.challenges = db.challenges.filter(c => c.id !== id);
    await saveDB();
    return true;
  },
  
  // Tournaments
  async getTournaments() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toLegacyTournament);
    }
    return db.tournaments;
  },
  
  async createTournament(tournament) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('tournaments').insert({
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
      }).select().single();
      if (error) throw error;
      return toLegacyTournament(data);
    }
    db.tournaments.push(tournament);
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
    const idx = db.tournaments.findIndex(t => t.id === id);
    if (idx !== -1) {
      db.tournaments[idx] = { ...db.tournaments[idx], ...updates };
      await saveDB();
      return db.tournaments[idx];
    }
    return null;
  },
  
  async deleteTournament(id) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db.tournaments = db.tournaments.filter(t => t.id !== id);
    await saveDB();
    return true;
  },
  
  // Reactions
  async getReactions() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('match_reactions').select('*');
      if (error) throw error;
      return data.map(toLegacyReaction);
    }
    return db.reactions;
  },
  
  // Full state (for /api/state)
  async getFullState() {
    if (isSupabaseEnabled()) {
      const [players, matches, history, rackets, pendingMatches, seasons, challenges, tournaments, reactions, leagues] = await Promise.all([
        this.getPlayers(),
        this.getMatches(),
        this.getHistory(),
        this.getRackets(),
        this.getPendingMatches(),
        this.getSeasons(),
        this.getChallenges(),
        this.getTournaments(),
        this.getReactions(),
        this.getLeagues(),
      ]);
      return { players, matches, history, rackets, pendingMatches, seasons, challenges, tournaments, reactions, leagues };
    }
    return {
      players: db.players,
      matches: db.matches,
      history: db.history,
      rackets: db.rackets,
      pendingMatches: db.pendingMatches,
      seasons: db.seasons,
      challenges: db.challenges,
      tournaments: db.tournaments,
      reactions: db.reactions,
      leagues: db.leagues || [],
    };
  },
  
  // Reset functions
  async resetPlayers(updates) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('players').update({
        elo_singles: updates.eloSingles,
        elo_doubles: updates.eloDoubles,
        wins_singles: updates.winsSingles ?? 0,
        losses_singles: updates.lossesSingles ?? 0,
        streak_singles: updates.streakSingles ?? 0,
        wins_doubles: updates.winsDoubles ?? 0,
        losses_doubles: updates.lossesDoubles ?? 0,
        streak_doubles: updates.streakDoubles ?? 0,
      }).neq('id', '');
      if (error) throw error;
      return true;
    }
    db.players = db.players.map(p => ({ ...p, ...updates }));
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
    db.matches = [];
    db.history = [];
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
    db = { players: [], matches: [], history: [], rackets: [], backups: [], admins: [], pendingMatches: [], seasons: [], challenges: [], tournaments: [], reactions: [], leagues: [] };
    await saveDB();
    return true;
  },

  // --- Leagues ---
  async getLeagues() {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        createdBy: l.created_by,
        createdAt: l.created_at,
      }));
    }
    return db.leagues || [];
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
    return (db.leagues || []).find(l => l.id === id) || null;
  },

  async createLeague(league) {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase.from('leagues').insert({
        id: league.id,
        name: league.name,
        description: league.description || null,
        created_by: league.createdBy,
      }).select().single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };
    }
    if (!db.leagues) db.leagues = [];
    const newLeague = { ...league, createdAt: new Date().toISOString() };
    db.leagues.push(newLeague);
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
    if (!db.leagues) db.leagues = [];
    const idx = db.leagues.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('League not found');
    db.leagues[idx] = { ...db.leagues[idx], ...updates };
    await saveDB();
    return db.leagues[idx];
  },

  async deleteLeague(id) {
    if (isSupabaseEnabled()) {
      // Unset league_id on affected players
      await supabase.from('players').update({ league_id: null }).eq('league_id', id);
      // Unset league_id on affected matches
      await supabase.from('matches').update({ league_id: null }).eq('league_id', id);
      const { error } = await supabase.from('leagues').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    if (!db.leagues) db.leagues = [];
    db.leagues = db.leagues.filter(l => l.id !== id);
    // Unset league references
    db.players = db.players.map(p => p.leagueId === id ? { ...p, leagueId: null } : p);
    db.matches = db.matches.map(m => m.leagueId === id ? { ...m, leagueId: null } : m);
    await saveDB();
    return true;
  },

  async assignPlayerLeague(playerId, leagueId) {
    if (isSupabaseEnabled()) {
      const { error } = await supabase.from('players').update({ league_id: leagueId }).eq('id', playerId);
      if (error) throw error;
      return true;
    }
    const idx = db.players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error('Player not found');
    db.players[idx].leagueId = leagueId;
    await saveDB();
    return true;
  },
};

// --- AUTH MIDDLEWARE ---
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || 'Anonymous',
      picture: decoded.picture || '',
    };
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const admins = await dbOps.getAdmins();
  const isAdmin = admins.includes(req.user.uid);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper: check if a user should be auto-promoted to admin
const shouldAutoPromote = (email) => {
  return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email);
};

// --- API ROUTES ---

// Public: get state
app.get('/api/state', authMiddleware, async (req, res) => {
  try {
    // Auto-confirm expired pending matches
    const now = Date.now();
    const pendingMatches = await dbOps.getPendingMatches();
    
    for (const pm of pendingMatches) {
      if (pm.status === 'pending' && new Date(pm.expiresAt).getTime() <= now) {
        // Calculate ELO delta
        const players = await dbOps.getPlayers();
        const getP = (id) => players.find(p => p.id === id);
        
        let wElo = 0, lElo = 0;
        if (pm.type === 'singles') {
          if (!pm.winners[0] || !pm.losers[0]) continue;
          wElo = getP(pm.winners[0])?.eloSingles || INITIAL_ELO;
          lElo = getP(pm.losers[0])?.eloSingles || INITIAL_ELO;
        } else {
          if (!pm.winners[0] || !pm.winners[1] || !pm.losers[0] || !pm.losers[1]) continue;
          wElo = (getP(pm.winners[0])?.eloDoubles || INITIAL_ELO + getP(pm.winners[1])?.eloDoubles || INITIAL_ELO) / 2;
          lElo = (getP(pm.losers[0])?.eloDoubles || INITIAL_ELO + getP(pm.losers[1])?.eloDoubles || INITIAL_ELO) / 2;
        }
        
        const delta = calculateMatchDelta(wElo, lElo);
        const timestamp = pm.createdAt;
        const matchId = pm.id; // Use the pending match ID as the match ID
        const historyEntries = [];
        
        const pmIsSingles = pm.type === 'singles';
        for (const p of players) {
          if (pm.winners.includes(p.id)) {
            const newElo = pmIsSingles ? p.eloSingles + delta : p.eloDoubles + delta;
            historyEntries.push({ playerId: p.id, matchId, newElo, timestamp, gameType: pm.type });
            await dbOps.updatePlayer(p.id, {
              eloSingles: pmIsSingles ? newElo : p.eloSingles,
              eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
              winsSingles: pmIsSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
              winsDoubles: !pmIsSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
              streakSingles: pmIsSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
              streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
            });
          } else if (pm.losers.includes(p.id)) {
            const newElo = pmIsSingles ? p.eloSingles - delta : p.eloDoubles - delta;
            historyEntries.push({ playerId: p.id, matchId, newElo, timestamp, gameType: pm.type });
            await dbOps.updatePlayer(p.id, {
              eloSingles: pmIsSingles ? newElo : p.eloSingles,
              eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
              lossesSingles: pmIsSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
              lossesDoubles: !pmIsSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
              streakSingles: pmIsSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
              streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
            });
          }
        }
        
        const newMatch = { 
          id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers, 
          scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser, 
          timestamp, eloChange: delta, loggedBy: pm.loggedBy 
        };
        await dbOps.createMatch(newMatch, pm.winners, pm.losers, historyEntries);
        await dbOps.updatePendingMatch(pm.id, { status: 'confirmed' });
      }
    }
    
    // Delete confirmed/rejected pending matches
    for (const pm of pendingMatches) {
      if (pm.status === 'confirmed' || pm.status === 'rejected') {
        await dbOps.deletePendingMatch(pm.id);
      }
    }
    
    const state = await dbOps.getFullState();
    // Filter out non-pending from the response
    state.pendingMatches = state.pendingMatches.filter(pm => pm.status === 'pending' || pm.status === 'disputed');
    
    res.json(state);
  } catch (err) {
    console.error('Error in /api/state:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Auth: /api/me ---
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    // Auto-promote admin from env var
    if (shouldAutoPromote(email)) {
      const admins = await dbOps.getAdmins();
      if (!admins.includes(uid)) {
        await dbOps.addAdmin(uid);
        console.log(`👑 Auto-promoted admin: ${email}`);
      }
    }

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(uid);

    // Find linked player
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

    // Include unclaimed players when user needs setup
    if (!player) {
      response.unclaimedPlayers = players.filter(p => !p.uid);
    }

    res.json(response);
  } catch (err) {
    console.error('Error in /api/me:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Profile Setup ---
app.post('/api/me/setup', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;

    // Check if player already exists
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
      winsSingles: 0,
      lossesSingles: 0,
      streakSingles: 0,
      winsDoubles: 0,
      lossesDoubles: 0,
      streakDoubles: 0,
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

// --- Claim unclaimed player account ---
app.post('/api/me/claim', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;

    // Check if user already has a player profile
    const existing = await dbOps.getPlayerByUid(uid);
    if (existing) {
      return res.status(400).json({ error: 'You already have a player profile' });
    }

    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId is required' });

    const player = await dbOps.getPlayerById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.uid) {
      return res.status(400).json({ error: 'This player is already linked to an account' });
    }

    // Claim: link the Firebase UID to the existing player record
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

// --- Edit own profile ---
app.put('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;
    const player = await dbOps.getPlayerByUid(uid);
    
    if (!player) {
      return res.status(404).json({ error: 'Player profile not found' });
    }

    const updates = {};
    if (req.body.name !== undefined) {
      const name = (req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Username is required' });
      if (name.length > 20) return res.status(400).json({ error: 'Username must be 20 characters or less' });
      updates.name = name;
    }
    if (req.body.avatar !== undefined) {
      updates.avatar = req.body.avatar;
    }
    if (req.body.bio !== undefined) {
      updates.bio = (req.body.bio || '').trim().substring(0, 150);
    }

    const updated = await dbOps.updatePlayer(player.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in /api/me/profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Players ---
app.post('/api/players', authMiddleware, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Player name is required' });
    if (name.length > 20) return res.status(400).json({ error: 'Player name must be 20 characters or less' });

    const newPlayer = {
      id: Date.now().toString(),
      name,
      avatar: req.body.avatar || '',
      mainRacketId: req.body.mainRacketId || undefined,
      eloSingles: INITIAL_ELO,
      eloDoubles: INITIAL_ELO,
      winsSingles: 0,
      lossesSingles: 0,
      streakSingles: 0,
      winsDoubles: 0,
      lossesDoubles: 0,
      streakDoubles: 0,
      joinedAt: new Date().toISOString(),
      uid: req.body.uid || undefined,
    };
    
    const created = await dbOps.createPlayer(newPlayer);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/players/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await dbOps.updatePlayer(req.params.id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (err) {
    console.error('Error in PUT /api/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/players/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deletePlayer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/players:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Rackets ---
app.post('/api/rackets', authMiddleware, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Racket name is required' });

    let stats = req.body.stats;

    // Validate structured stats
    if (stats && typeof stats === 'object') {
      const statKeys = ['speed', 'spin', 'power', 'control', 'defense', 'chaos'];
      const total = statKeys.reduce((sum, key) => sum + (Number(stats[key]) || 0), 0);
      if (total > STAT_BUDGET) {
        return res.status(400).json({ error: `Stat budget exceeded: ${total}/${STAT_BUDGET}` });
      }
      // Ensure all keys are numbers
      stats = {};
      for (const key of statKeys) {
        stats[key] = Math.max(0, Math.min(20, Math.round(Number(req.body.stats[key]) || 0)));
      }
    }

    const newRacket = {
      id: Date.now().toString(),
      name,
      icon: req.body.icon || 'Zap',
      color: req.body.color || '#00f3ff',
      stats: stats || { speed: 5, spin: 5, power: 5, control: 5, defense: 5, chaos: 5 },
      createdBy: req.user.uid,
    };
    
    const created = await dbOps.createRacket(newRacket);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/rackets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/rackets/:id', authMiddleware, async (req, res) => {
  try {
    const racket = await dbOps.getRackets().then(rackets => rackets.find(r => r.id === req.params.id));
    if (!racket) return res.status(404).json({ error: 'Racket not found' });

    const updates = {};
    const { name, icon, color, stats } = req.body;

    if (name !== undefined) {
      const trimmed = (name || '').trim();
      if (!trimmed) return res.status(400).json({ error: 'Racket name cannot be empty' });
      updates.name = trimmed;
    }
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;

    if (stats && typeof stats === 'object') {
      const statKeys = ['speed', 'spin', 'power', 'control', 'defense', 'chaos'];
      const validated = {};
      for (const key of statKeys) {
        validated[key] = Math.max(0, Math.min(20, Math.round(Number(stats[key]) || 0)));
      }
      const total = statKeys.reduce((sum, key) => sum + validated[key], 0);
      if (total > STAT_BUDGET) {
        return res.status(400).json({ error: `Stat budget exceeded: ${total}/${STAT_BUDGET}` });
      }
      updates.stats = validated;
    }

    const updated = await dbOps.updateRacket(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/rackets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/rackets/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deleteRacket(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/rackets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Matches ---
app.post('/api/matches', authMiddleware, async (req, res) => {
  try {
    const { type, winners, losers, scoreWinner, scoreLoser, isFriendly } = req.body;

    // Validate inputs
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
    const getP = (id) => players.find(p => p.id === id);

    // Self-only match logging: user must be a participant (admins bypass)
    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    if (!isAdmin) {
      const callerPlayer = players.find(p => p.uid === req.user.uid);
      if (!callerPlayer) {
        return res.status(403).json({ error: 'You need a player profile to log matches' });
      }
      const allParticipants = [...winners, ...losers];
      if (!allParticipants.includes(callerPlayer.id)) {
        return res.status(403).json({ error: 'You can only log matches where you are a participant' });
      }
    }

    // Validate all players exist
    const allIds = [...winners, ...losers];
    for (const id of allIds) {
      if (!getP(id)) {
        return res.status(400).json({ error: `Player with ID "${id}" not found` });
      }
    }

    const friendly = !!isFriendly;
    const timestamp = new Date().toISOString();
    const matchId = Date.now().toString(); // Generate match ID first
    let delta = 0;
    const historyEntries = [];

    if (!friendly) {
      // Ranked match: calculate and apply ELO
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
      delta = calculateMatchDelta(wElo, lElo);

      for (const p of players) {
        if (winners.includes(p.id)) {
          const newElo = type === 'singles' ? p.eloSingles + delta : p.eloDoubles + delta;
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
          const newElo = type === 'singles' ? p.eloSingles - delta : p.eloDoubles - delta;
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
      // Friendly match: no ELO change, but update wins/losses/streak
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
    
    console.log('[DEBUG] POST /api/matches - before createMatch:', { matchId, type, winners, losers, delta, isNaN: isNaN(delta), historyEntriesCount: historyEntries.length });
    const created = await dbOps.createMatch(newMatch, winners, losers, historyEntries);
    console.log('[DEBUG] POST /api/matches - createMatch success:', { createdId: created?.id });
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/matches:', err);
    // #region agent log - Hypothesis C/D/E: Exception caught
    fetch('http://127.0.0.1:7242/ingest/46adb973-1f59-4ccf-87ee-78cf19e34bcf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:1618',message:'Exception in POST /api/matches',data:{errorMessage:err?.message,errorStack:err?.stack?.split('\n')?.slice(0,3)},timestamp:Date.now(),runId:'debug-run',hypothesisId:'CDE'})}).catch(()=>{});
    // #endregion
    res.status(500).json({ error: 'Internal server error' });
  }
});

// EDIT match
app.put('/api/matches/:id', authMiddleware, async (req, res) => {
  try {
    const matches = await dbOps.getMatches();
    const match = matches.find(m => m.id === req.params.id);
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
    const getP = (id) => players.find(p => p.id === id);

    // Validate all new players exist
    const allIds = [...winners, ...losers];
    for (const id of allIds) {
      if (!getP(id)) {
        return res.status(400).json({ error: `Player with ID "${id}" not found` });
      }
    }

    // Step 1: Reverse old ELO changes
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

    // Remove old history entries
    if (isSupabaseEnabled()) {
      await supabase.from('elo_history').delete().eq('match_id', match.timestamp);
      await supabase.from('match_players').delete().eq('match_id', match.id);
    }

    // Step 2: Apply new ELO changes
    const type = match.type;
    let wElo = 0, lElo = 0;

    if (type === 'singles') {
      if (!winners[0] || !losers[0]) {
        return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
      }
      const winner = await dbOps.getPlayerById(winners[0]);
      const loser = await dbOps.getPlayerById(losers[0]);
      if (!winner || !loser) {
        return res.status(400).json({ error: 'Player not found' });
      }
      wElo = winner.eloSingles;
      lElo = loser.eloSingles;
    } else {
      if (!winners[0] || !winners[1] || !losers[0] || !losers[1]) {
        return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
      }
      const winner1 = await dbOps.getPlayerById(winners[0]);
      const winner2 = await dbOps.getPlayerById(winners[1]);
      const loser1 = await dbOps.getPlayerById(losers[0]);
      const loser2 = await dbOps.getPlayerById(losers[1]);
      if (!winner1 || !winner2 || !loser1 || !loser2) {
        return res.status(400).json({ error: 'One or more players not found' });
      }
      wElo = (winner1.eloDoubles + winner2.eloDoubles) / 2;
      lElo = (loser1.eloDoubles + loser2.eloDoubles) / 2;
    }

    const newDelta = calculateMatchDelta(wElo, lElo);
    const newTimestamp = match.timestamp;
    const editMatchId = req.params.id; // Use the existing match ID
    const historyEntries = [];

    const updatedPlayers = await dbOps.getPlayers();
    const isSingles = type === 'singles';
    for (const p of updatedPlayers) {
      if (winners.includes(p.id)) {
        const newElo = isSingles ? p.eloSingles + newDelta : p.eloDoubles + newDelta;
        historyEntries.push({ playerId: p.id, matchId: editMatchId, newElo, timestamp: newTimestamp, gameType: type });
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
        historyEntries.push({ playerId: p.id, matchId: editMatchId, newElo, timestamp: newTimestamp, gameType: type });
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

    // Update match
    if (isSupabaseEnabled()) {
      await supabase.from('matches').update({
        score_winner: scoreWinner,
        score_loser: scoreLoser,
        elo_change: newDelta,
      }).eq('id', req.params.id);
      
      await supabase.from('match_players').insert([
        ...winners.map(id => ({ match_id: match.id, player_id: id, is_winner: true })),
        ...losers.map(id => ({ match_id: match.id, player_id: id, is_winner: false })),
      ]);
      
      await supabase.from('elo_history').insert(historyEntries.map(h => ({
        player_id: h.playerId,
        match_id: h.matchId,
        new_elo: h.newElo,
        timestamp: h.timestamp,
        game_type: h.gameType,
      })));
    } else {
      const matchIdx = db.matches.findIndex(m => m.id === req.params.id);
      db.matches[matchIdx] = { ...match, winners, losers, scoreWinner, scoreLoser, eloChange: newDelta };
      db.history = db.history.filter(h => h.matchId !== match.timestamp);
      db.history.push(...historyEntries);
      await saveDB();
    }

    const updatedMatch = { ...match, winners, losers, scoreWinner, scoreLoser, eloChange: newDelta };
    res.json(updatedMatch);
  } catch (err) {
    console.error('Error in PUT /api/matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE match
app.delete('/api/matches/:id', authMiddleware, async (req, res) => {
  try {
    const matches = await dbOps.getMatches();
    const match = matches.find(m => m.id === req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    const isCreator = match.loggedBy && match.loggedBy === req.user.uid;
    const matchAge = Date.now() - new Date(match.timestamp).getTime();
    const withinWindow = matchAge < 60000;

    if (!isAdmin && !(isCreator && withinWindow)) {
      return res.status(403).json({ error: 'Not authorized to delete this match' });
    }

    const { type, winners, losers, eloChange } = match;
    const isSingles = type === 'singles';

    // Reverse ELO and W/L for each player involved
    const players = await dbOps.getPlayers();
    for (const p of players) {
      if (winners.includes(p.id)) {
        const restoredElo = isSingles ? p.eloSingles - eloChange : p.eloDoubles - eloChange;
        await dbOps.updatePlayer(p.id, {
          eloSingles: isSingles ? restoredElo : p.eloSingles,
          eloDoubles: !isSingles ? restoredElo : p.eloDoubles,
          winsSingles: isSingles ? Math.max(0, (p.winsSingles || 0) - 1) : (p.winsSingles || 0),
          winsDoubles: !isSingles ? Math.max(0, (p.winsDoubles || 0) - 1) : (p.winsDoubles || 0),
          streakSingles: isSingles ? 0 : (p.streakSingles || 0),
          streakDoubles: !isSingles ? 0 : (p.streakDoubles || 0),
        });
      } else if (losers.includes(p.id)) {
        const restoredElo = isSingles ? p.eloSingles + eloChange : p.eloDoubles + eloChange;
        await dbOps.updatePlayer(p.id, {
          eloSingles: isSingles ? restoredElo : p.eloSingles,
          eloDoubles: !isSingles ? restoredElo : p.eloDoubles,
          lossesSingles: isSingles ? Math.max(0, (p.lossesSingles || 0) - 1) : (p.lossesSingles || 0),
          lossesDoubles: !isSingles ? Math.max(0, (p.lossesDoubles || 0) - 1) : (p.lossesDoubles || 0),
          streakSingles: isSingles ? 0 : (p.streakSingles || 0),
          streakDoubles: !isSingles ? 0 : (p.streakDoubles || 0),
        });
      }
    }

    await dbOps.deleteMatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export league data
app.get('/api/export', authMiddleware, async (req, res) => {
  try {
    const state = await dbOps.getFullState();
    res.json({ 
      players: state.players, 
      matches: state.matches, 
      history: state.history, 
      rackets: state.rackets 
    });
  } catch (err) {
    console.error('Error in /api/export:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import league data (admin only)
app.post('/api/import', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { players, matches, history, rackets } = req.body;
    if (!Array.isArray(players) || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Invalid import data: players and matches must be arrays' });
    }
    
    if (isSupabaseEnabled()) {
      // Import to Supabase
      for (const p of players) {
        await supabase.from('players').upsert({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          bio: p.bio,
          elo_singles: p.eloSingles,
          elo_doubles: p.eloDoubles,
          wins_singles: p.winsSingles ?? 0,
          losses_singles: p.lossesSingles ?? 0,
          streak_singles: p.streakSingles ?? 0,
          wins_doubles: p.winsDoubles ?? 0,
          losses_doubles: p.lossesDoubles ?? 0,
          streak_doubles: p.streakDoubles ?? 0,
          joined_at: p.joinedAt,
          main_racket_id: p.mainRacketId,
          firebase_uid: p.uid,
        });
      }
      // Similar for other tables...
    } else {
      db.players = players;
      db.matches = matches;
      db.history = Array.isArray(history) ? history : [];
      db.rackets = Array.isArray(rackets) ? rackets : db.rackets;
      await saveDB();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/import:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset (admin only)
app.post('/api/reset', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.body.mode === 'season') {
      await dbOps.resetPlayers({ 
        eloSingles: INITIAL_ELO, 
        eloDoubles: INITIAL_ELO, 
        winsSingles: 0, 
        lossesSingles: 0, 
        streakSingles: 0,
        winsDoubles: 0, 
        lossesDoubles: 0, 
        streakDoubles: 0,
      });
      await dbOps.clearMatches();
    } else if (req.body.mode === 'fresh') {
      await dbOps.clearAllData();
    } else {
      seedData();
      await saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/reset:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recalculate all player stats from match history (admin only)
app.post('/api/admin/recalculate-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const players = await dbOps.getPlayers();
    const matches = await dbOps.getMatches();
    
    // Reset all player stats to 0
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
    
    // Sort matches by timestamp (oldest first)
    const sortedMatches = [...matches].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Recalculate stats for each match
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
    
    // Update all players with recalculated stats
    for (const p of players) {
      const stats = playerStats[p.id];
      await dbOps.updatePlayer(p.id, stats);
    }
    
    res.json({ 
      success: true, 
      message: `Recalculated stats for ${players.length} players from ${matches.length} matches`,
      playerStats 
    });
  } catch (err) {
    console.error('Error in POST /api/admin/recalculate-stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin Endpoints ---
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const players = await dbOps.getPlayers();
    const admins = await dbOps.getAdmins();
    
    const users = players
      .filter(p => p.uid)
      .map(p => ({
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

app.post('/api/admin/promote', authMiddleware, adminMiddleware, async (req, res) => {
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

app.post('/api/admin/demote', authMiddleware, adminMiddleware, async (req, res) => {
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

// --- Pending Match Confirmation ---
app.post('/api/pending-matches', authMiddleware, async (req, res) => {
  try {
    const { type, winners, losers, scoreWinner, scoreLoser } = req.body;
    if (!type || !['singles', 'doubles'].includes(type)) return res.status(400).json({ error: 'Invalid game type' });
    if (!Array.isArray(winners) || !Array.isArray(losers)) return res.status(400).json({ error: 'Winners and losers must be arrays' });

    const players = await dbOps.getPlayers();

    // Self-only match logging: user must be a participant (admins bypass)
    const admins = await dbOps.getAdmins();
    const isAdmin = admins.includes(req.user.uid);
    if (!isAdmin) {
      const callerPlayer = players.find(p => p.uid === req.user.uid);
      if (!callerPlayer) {
        return res.status(403).json({ error: 'You need a player profile to log matches' });
      }
      const allParticipants = [...winners, ...losers];
      if (!allParticipants.includes(callerPlayer.id)) {
        return res.status(403).json({ error: 'You can only log matches where you are a participant' });
      }
    }

    for (const id of [...winners, ...losers]) {
      if (!players.find(p => p.id === id)) return res.status(400).json({ error: `Player "${id}" not found` });
    }

    const pending = {
      id: Date.now().toString(),
      type, winners, losers, scoreWinner, scoreLoser,
      loggedBy: req.user.uid,
      status: 'pending',
      confirmations: [req.user.uid],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    
    const created = await dbOps.createPendingMatch(pending, winners, losers);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/pending-matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/pending-matches/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const pendingMatches = await dbOps.getPendingMatches();
    const pm = pendingMatches.find(m => m.id === req.params.id);
    if (!pm) return res.status(404).json({ error: 'Pending match not found' });
    if (pm.status !== 'pending') return res.status(400).json({ error: 'Match is not pending' });

    const confirmations = [...pm.confirmations];
    if (!confirmations.includes(req.user.uid)) {
      confirmations.push(req.user.uid);
    }

    // Check if all involved players (with accounts) have confirmed
    const players = await dbOps.getPlayers();
    const involvedUids = [...pm.winners, ...pm.losers]
      .map(id => players.find(p => p.id === id)?.uid)
      .filter(Boolean);
    const allConfirmed = involvedUids.every(uid => confirmations.includes(uid));

    if (allConfirmed || involvedUids.length <= 1) {
      // Move to confirmed: create actual match with ELO
      const getP = (id) => players.find(p => p.id === id);
      let wElo = 0, lElo = 0;
      if (pm.type === 'singles') {
        if (!pm.winners[0] || !pm.losers[0] || !getP(pm.winners[0]) || !getP(pm.losers[0])) {
          return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
        }
        wElo = getP(pm.winners[0]).eloSingles;
        lElo = getP(pm.losers[0]).eloSingles;
      } else {
        if (!pm.winners[0] || !pm.winners[1] || !pm.losers[0] || !pm.losers[1]) {
          return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
        }
        const w1 = getP(pm.winners[0]);
        const w2 = getP(pm.winners[1]);
        const l1 = getP(pm.losers[0]);
        const l2 = getP(pm.losers[1]);
        if (!w1 || !w2 || !l1 || !l2) {
          return res.status(400).json({ error: 'One or more players not found' });
        }
        wElo = (w1.eloDoubles + w2.eloDoubles) / 2;
        lElo = (l1.eloDoubles + l2.eloDoubles) / 2;
      }
      
      const delta = calculateMatchDelta(wElo, lElo);
      const timestamp = pm.createdAt;
      const confirmMatchId = pm.id; // Use the pending match ID as the match ID
      const historyEntries = [];

      const pmIsSingles = pm.type === 'singles';
      for (const p of players) {
        if (pm.winners.includes(p.id)) {
          const newElo = pmIsSingles ? p.eloSingles + delta : p.eloDoubles + delta;
          historyEntries.push({ playerId: p.id, matchId: confirmMatchId, newElo, timestamp, gameType: pm.type });
          await dbOps.updatePlayer(p.id, {
            eloSingles: pmIsSingles ? newElo : p.eloSingles,
            eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
            winsSingles: pmIsSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
            winsDoubles: !pmIsSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
            streakSingles: pmIsSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
            streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
          });
        } else if (pm.losers.includes(p.id)) {
          const newElo = pmIsSingles ? p.eloSingles - delta : p.eloDoubles - delta;
          historyEntries.push({ playerId: p.id, matchId: confirmMatchId, newElo, timestamp, gameType: pm.type });
          await dbOps.updatePlayer(p.id, {
            eloSingles: pmIsSingles ? newElo : p.eloSingles,
            eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
            lossesSingles: pmIsSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
            lossesDoubles: !pmIsSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
            streakSingles: pmIsSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
            streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
          });
        }
      }

      const newMatch = { 
        id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers, 
        scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser, 
        timestamp, eloChange: delta, loggedBy: pm.loggedBy 
      };
      
      await dbOps.createMatch(newMatch, pm.winners, pm.losers, historyEntries);
      await dbOps.deletePendingMatch(pm.id);
      return res.json({ ...pm, status: 'confirmed', confirmations, match: newMatch });
    }

    await dbOps.updatePendingMatch(pm.id, { confirmations });
    res.json({ ...pm, confirmations });
  } catch (err) {
    console.error('Error in PUT /api/pending-matches/:id/confirm:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/pending-matches/:id/dispute', authMiddleware, async (req, res) => {
  try {
    const updated = await dbOps.updatePendingMatch(req.params.id, { status: 'disputed' });
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Pending match not found' });
    }
  } catch (err) {
    console.error('Error in PUT /api/pending-matches/:id/dispute:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/pending-matches/:id/force-confirm', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pendingMatches = await dbOps.getPendingMatches();
    const pm = pendingMatches.find(m => m.id === req.params.id);
    if (!pm) return res.status(404).json({ error: 'Pending match not found' });

    const players = await dbOps.getPlayers();
    const getP = (id) => players.find(p => p.id === id);
    let wElo = 0, lElo = 0;
    if (pm.type === 'singles') {
      if (!pm.winners[0] || !pm.losers[0] || !getP(pm.winners[0]) || !getP(pm.losers[0])) {
        return res.status(400).json({ error: 'Singles match requires exactly 1 winner and 1 loser' });
      }
      wElo = getP(pm.winners[0]).eloSingles;
      lElo = getP(pm.losers[0]).eloSingles;
    } else {
      if (!pm.winners[0] || !pm.winners[1] || !pm.losers[0] || !pm.losers[1]) {
        return res.status(400).json({ error: 'Doubles match requires exactly 2 winners and 2 losers' });
      }
      const w1 = getP(pm.winners[0]);
      const w2 = getP(pm.winners[1]);
      const l1 = getP(pm.losers[0]);
      const l2 = getP(pm.losers[1]);
      if (!w1 || !w2 || !l1 || !l2) {
        return res.status(400).json({ error: 'One or more players not found' });
      }
      wElo = (w1.eloDoubles + w2.eloDoubles) / 2;
      lElo = (l1.eloDoubles + l2.eloDoubles) / 2;
    }

    const delta = calculateMatchDelta(wElo, lElo);
    const timestamp = pm.createdAt;
    const forceMatchId = pm.id; // Use the pending match ID as the match ID
    const historyEntries = [];

    const pmIsSingles = pm.type === 'singles';
    for (const p of players) {
      if (pm.winners.includes(p.id)) {
        const newElo = pmIsSingles ? p.eloSingles + delta : p.eloDoubles + delta;
        historyEntries.push({ playerId: p.id, matchId: forceMatchId, newElo, timestamp, gameType: pm.type });
        await dbOps.updatePlayer(p.id, {
          eloSingles: pmIsSingles ? newElo : p.eloSingles,
          eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
          winsSingles: pmIsSingles ? (p.winsSingles || 0) + 1 : (p.winsSingles || 0),
          winsDoubles: !pmIsSingles ? (p.winsDoubles || 0) + 1 : (p.winsDoubles || 0),
          streakSingles: pmIsSingles ? ((p.streakSingles || 0) >= 0 ? (p.streakSingles || 0) + 1 : 1) : (p.streakSingles || 0),
          streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) >= 0 ? (p.streakDoubles || 0) + 1 : 1) : (p.streakDoubles || 0),
        });
      } else if (pm.losers.includes(p.id)) {
        const newElo = pmIsSingles ? p.eloSingles - delta : p.eloDoubles - delta;
        historyEntries.push({ playerId: p.id, matchId: forceMatchId, newElo, timestamp, gameType: pm.type });
        await dbOps.updatePlayer(p.id, {
          eloSingles: pmIsSingles ? newElo : p.eloSingles,
          eloDoubles: !pmIsSingles ? newElo : p.eloDoubles,
          lossesSingles: pmIsSingles ? (p.lossesSingles || 0) + 1 : (p.lossesSingles || 0),
          lossesDoubles: !pmIsSingles ? (p.lossesDoubles || 0) + 1 : (p.lossesDoubles || 0),
          streakSingles: pmIsSingles ? ((p.streakSingles || 0) <= 0 ? (p.streakSingles || 0) - 1 : -1) : (p.streakSingles || 0),
          streakDoubles: !pmIsSingles ? ((p.streakDoubles || 0) <= 0 ? (p.streakDoubles || 0) - 1 : -1) : (p.streakDoubles || 0),
        });
      }
    }

    const newMatch = { 
      id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers, 
      scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser, 
      timestamp, eloChange: delta, loggedBy: pm.loggedBy 
    };
    
    await dbOps.createMatch(newMatch, pm.winners, pm.losers, historyEntries);
    await dbOps.deletePendingMatch(pm.id);
    
    res.json({ ...pm, status: 'confirmed', match: newMatch });
  } catch (err) {
    console.error('Error in PUT /api/pending-matches/:id/force-confirm:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/pending-matches/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deletePendingMatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/pending-matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Seasons ---
app.get('/api/seasons', authMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    res.json(seasons);
  } catch (err) {
    console.error('Error in /api/seasons:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/seasons/start', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    const activeSeason = seasons.find(s => s.status === 'active');
    if (activeSeason) return res.status(400).json({ error: 'A season is already active. End it first.' });

    const seasonNumber = seasons.length + 1;
    const name = (req.body.name || '').trim() || `Season ${seasonNumber}`;
    const season = {
      id: Date.now().toString(),
      name,
      number: seasonNumber,
      status: 'active',
      startedAt: new Date().toISOString(),
      finalStandings: [],
      matchCount: 0,
    };

    // Reset ELOs and stats
    await dbOps.resetPlayers({ 
      eloSingles: INITIAL_ELO, 
      eloDoubles: INITIAL_ELO, 
      winsSingles: 0, 
      lossesSingles: 0, 
      streakSingles: 0,
      winsDoubles: 0, 
      lossesDoubles: 0, 
      streakDoubles: 0,
    });
    await dbOps.clearMatches();
    
    const created = await dbOps.createSeason(season);
    res.json(created);
  } catch (err) {
    console.error('Error in POST /api/seasons/start:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/seasons/end', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const seasons = await dbOps.getSeasons();
    const idx = seasons.findIndex(s => s.status === 'active');
    if (idx === -1) return res.status(400).json({ error: 'No active season to end' });

    const players = await dbOps.getPlayers();
    const standings = [...players]
      .sort((a, b) => b.eloSingles - a.eloSingles)
      .map((p, i) => ({
        playerId: p.id, playerName: p.name, rank: i + 1,
        eloSingles: p.eloSingles, eloDoubles: p.eloDoubles,
        wins: p.wins, losses: p.losses,
      }));

    const matches = await dbOps.getMatches();
    const updated = await dbOps.updateSeason(seasons[idx].id, {
      status: 'completed',
      endedAt: new Date().toISOString(),
      finalStandings: standings,
      matchCount: matches.length,
      championId: standings.length > 0 ? standings[0].playerId : undefined,
    });
    
    res.json(updated);
  } catch (err) {
    console.error('Error in POST /api/seasons/end:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Challenges ---
app.get('/api/challenges', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    res.json(challenges);
  } catch (err) {
    console.error('Error in /api/challenges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/challenges', authMiddleware, async (req, res) => {
  try {
    const { challengedId, wager, message } = req.body;
    const challengerPlayer = await dbOps.getPlayerByUid(req.user.uid);
    if (!challengerPlayer) return res.status(400).json({ error: 'You need a player profile first' });

    const players = await dbOps.getPlayers();
    const challenged = players.find(p => p.id === challengedId);
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

app.put('/api/challenges/:id/respond', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find(c => c.id === req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const userPlayer = await dbOps.getPlayerByUid(req.user.uid);
    if (!userPlayer || userPlayer.id !== challenge.challengedId) {
      return res.status(403).json({ error: 'Only the challenged player can respond' });
    }
    if (challenge.status !== 'pending') return res.status(400).json({ error: 'Challenge is no longer pending' });

    const { accept } = req.body;
    const updated = await dbOps.updateChallenge(req.params.id, { 
      status: accept ? 'accepted' : 'declined' 
    });
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/challenges/:id/respond:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/challenges/:id/complete', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find(c => c.id === req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.status !== 'accepted') return res.status(400).json({ error: 'Challenge must be accepted first' });

    const { matchId } = req.body;
    const updates = { matchId, status: 'completed' };

    // Apply wager bonus if applicable
    if (challenge.wager > 0 && matchId) {
      const matches = await dbOps.getMatches();
      const match = matches.find(m => m.id === matchId);
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

app.delete('/api/challenges/:id', authMiddleware, async (req, res) => {
  try {
    const challenges = await dbOps.getChallenges();
    const challenge = challenges.find(c => c.id === req.params.id);
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

// --- Tournaments ---
app.get('/api/tournaments', authMiddleware, async (req, res) => {
  try {
    const tournaments = await dbOps.getTournaments();
    res.json(tournaments);
  } catch (err) {
    console.error('Error in /api/tournaments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tournaments', authMiddleware, adminMiddleware, async (req, res) => {
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
      if (!players.find(p => p.id === id)) {
        return res.status(400).json({ error: `Player "${id}" not found` });
      }
    }

    // Generate rounds
    let rounds = [];
    if (format === 'single_elimination') {
      // Seed by ELO
      const eloKey = gameType === 'singles' ? 'eloSingles' : 'eloDoubles';
      const seeded = playerIds
        .map(id => players.find(p => p.id === id))
        .sort((a, b) => b[eloKey] - a[eloKey])
        .map(p => p.id);

      // Pad to next power of 2
      let size = 1;
      while (size < seeded.length) size *= 2;
      while (seeded.length < size) seeded.push(null);

      // Generate first round
      const firstRound = [];
      for (let i = 0; i < size / 2; i++) {
        firstRound.push({
          id: `m-${Date.now()}-${i}`,
          player1Id: seeded[i],
          player2Id: seeded[size - 1 - i],
        });
      }
      rounds.push({ roundNumber: 1, matchups: firstRound });

      // Generate placeholder rounds
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

      // Auto-advance BYEs in first round
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
      // Round Robin: generate all pairs
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
      // Split into rounds
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

app.put('/api/tournaments/:id/result', authMiddleware, async (req, res) => {
  try {
    const tournaments = await dbOps.getTournaments();
    const tournament = tournaments.find(t => t.id === req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (tournament.status !== 'in_progress') return res.status(400).json({ error: 'Tournament is not in progress' });

    const { matchupId, winnerId, score1, score2 } = req.body;
    let found = false;

    for (const round of tournament.rounds) {
      const matchup = round.matchups.find(m => m.id === matchupId);
      if (matchup) {
        matchup.winnerId = winnerId;
        matchup.scorePlayer1 = score1;
        matchup.scorePlayer2 = score2;
        found = true;

        // For single elimination, advance winner to next round
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

    // Check if tournament is complete
    const allMatchups = tournament.rounds.flatMap(r => r.matchups).filter(m => m.player1Id && m.player2Id);
    const allComplete = allMatchups.every(m => m.winnerId);

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
        // Round robin: winner is player with most wins
        const winCounts = {};
        allMatchups.forEach(m => { winCounts[m.winnerId] = (winCounts[m.winnerId] || 0) + 1; });
        const sorted = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);
        winnerId = sorted[0]?.[0];
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

app.put('/api/tournaments/:id/players', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tournaments = await dbOps.getTournaments();
    const tournament = tournaments.find(t => t.id === req.params.id);
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

app.delete('/api/tournaments/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbOps.deleteTournament(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/tournaments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Player of the Week ---
app.get('/api/player-of-week', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const matches = await dbOps.getMatches();
    const weekMatches = matches.filter(m => new Date(m.timestamp) >= weekStart);
    
    if (weekMatches.length === 0) return res.json({ player: null, stats: null });

    const players = await dbOps.getPlayers();
    const scores = {};
    
    for (const p of players) {
      const wins = weekMatches.filter(m => m.winners.includes(p.id)).length;
      const losses = weekMatches.filter(m => m.losers.includes(p.id)).length;
      const eloGained = weekMatches.filter(m => m.winners.includes(p.id)).reduce((sum, m) => sum + m.eloChange, 0);
      const streak = Math.max(0, p.streak);
      const score = (wins * 3) + (eloGained * 0.5) + (streak * 2);
      if (wins + losses > 0) {
        scores[p.id] = { playerId: p.id, wins, losses, matches: wins + losses, eloGained, score, winRate: wins / (wins + losses) };
      }
    }

    const sorted = Object.values(scores).sort((a, b) => b.score - a.score || b.winRate - a.winRate || b.matches - a.matches);
    if (sorted.length === 0) return res.json({ player: null, stats: null });

    const winner = sorted[0];
    const player = players.find(p => p.id === winner.playerId);
    res.json({ player, stats: winner });
  } catch (err) {
    console.error('Error in /api/player-of-week:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Hall of Fame ---
app.get('/api/hall-of-fame', authMiddleware, async (req, res) => {
  try {
    const records = {};
    const history = await dbOps.getHistory();
    const players = await dbOps.getPlayers();
    const matches = await dbOps.getMatches();

    // Highest ELO ever (singles)
    if (history.length > 0) {
      const singlesHistory = history.filter(h => h.gameType === 'singles');
      if (singlesHistory.length > 0) {
        const best = singlesHistory.reduce((max, h) => h.newElo > max.newElo ? h : max);
        const player = players.find(p => p.id === best.playerId);
        records.highestEloSingles = { playerId: best.playerId, playerName: player?.name, value: best.newElo, date: best.timestamp };
      }
      const doublesHistory = history.filter(h => h.gameType === 'doubles');
      if (doublesHistory.length > 0) {
        const best = doublesHistory.reduce((max, h) => h.newElo > max.newElo ? h : max);
        const player = players.find(p => p.id === best.playerId);
        records.highestEloDoubles = { playerId: best.playerId, playerName: player?.name, value: best.newElo, date: best.timestamp };
      }
    }

    // Most matches played
    if (players.length > 0) {
      const most = [...players].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))[0];
      records.mostMatchesPlayed = { playerId: most.id, playerName: most.name, value: most.wins + most.losses };
    }

    // Best win rate (min 20 matches)
    const qualified = players.filter(p => p.wins + p.losses >= 20);
    if (qualified.length > 0) {
      const best = qualified.sort((a, b) => (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses)))[0];
      records.bestWinRate = { playerId: best.id, playerName: best.name, value: Math.round(100 * best.wins / (best.wins + best.losses)) };
    }

    // Highest single-match ELO gain
    if (matches.length > 0) {
      const best = [...matches].sort((a, b) => b.eloChange - a.eloChange)[0];
      records.highestEloGain = { 
        matchId: best.id, 
        value: best.eloChange, 
        winners: best.winners.map(id => players.find(p => p.id === id)?.name || 'Unknown') 
      };
    }

    // Most dominant victory (score margin)
    if (matches.length > 0) {
      const best = [...matches].sort((a, b) => (b.scoreWinner - b.scoreLoser) - (a.scoreWinner - a.scoreLoser))[0];
      records.mostDominantVictory = { 
        matchId: best.id, 
        score: `${best.scoreWinner}-${best.scoreLoser}`, 
        margin: best.scoreWinner - best.scoreLoser, 
        winners: best.winners.map(id => players.find(p => p.id === id)?.name || 'Unknown') 
      };
    }

    res.json(records);
  } catch (err) {
    console.error('Error in /api/hall-of-fame:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Leagues ---
app.get('/api/leagues', authMiddleware, async (req, res) => {
  try {
    const leagues = await dbOps.getLeagues();
    res.json(leagues);
  } catch (err) {
    console.error('Error in GET /api/leagues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/leagues', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'League name is required' });

    const league = await dbOps.createLeague({
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim() || null,
      createdBy: req.user.uid,
    });

    res.json(league);
  } catch (err) {
    console.error('Error in POST /api/leagues:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/leagues/:id', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    const league = await dbOps.updateLeague(req.params.id, updates);
    res.json(league);
  } catch (err) {
    console.error('Error in PUT /api/leagues/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/leagues/:id', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    await dbOps.deleteLeague(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/leagues/:id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/players/:id/league', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) return res.status(403).json({ error: 'Admin only' });

    const { leagueId } = req.body;
    // Validate league exists if not null
    if (leagueId) {
      const league = await dbOps.getLeagueById(leagueId);
      if (!league) return res.status(400).json({ error: 'League not found' });
    }

    await dbOps.assignPlayerLeague(req.params.id, leagueId || null);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in PUT /api/players/:id/league:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all
app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else {
    res.status(404).send('CyberPong Backend: 404 Not Found. If testing in dev, ensure server.js is running.');
  }
});

// Start Server
const startServer = async () => {
  if (!isSupabaseEnabled()) {
    await loadDB();
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (ADMIN_EMAILS.length > 0) {
      console.log(`👑 Admin emails: ${ADMIN_EMAILS.join(', ')}`);
    }
  });
};

startServer();
