import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import admin from 'firebase-admin';

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
  console.log(`☁️ Running in Cloud Mode with Bucket: ${GCS_BUCKET}`);
  storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET);
} else {
  console.log('💻 Running in Local Mode (Local Filesystem)');
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

// --- DATA STORE ---
let db = {
  players: [],
  matches: [],
  history: [],
  rackets: [],
  backups: [],
  admins: [], // Array of UIDs
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
    { id: '1', name: 'Neo', avatar: "https://picsum.photos/id/64/200/200", eloSingles: 1450, eloDoubles: 1200, wins: 15, losses: 2, streak: 5, joinedAt: new Date().toISOString(), mainRacketId: 'r1' },
    { id: '2', name: 'Trinity', avatar: "https://picsum.photos/id/65/200/200", eloSingles: 1380, eloDoubles: 1250, wins: 12, losses: 5, streak: 2, joinedAt: new Date().toISOString(), mainRacketId: 'r2' },
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

// --- PERSISTENCE ---
const loadDB = async () => {
  try {
    if (bucket) {
      const file = bucket.file('db.json');
      const [exists] = await file.exists();
      if (exists) {
        const [contents] = await file.download();
        db = { ...db, ...JSON.parse(contents.toString()) };
        // Ensure arrays exist for old databases
        if (!Array.isArray(db.admins)) db.admins = [];
        if (!Array.isArray(db.pendingMatches)) db.pendingMatches = [];
        if (!Array.isArray(db.seasons)) db.seasons = [];
        if (!Array.isArray(db.challenges)) db.challenges = [];
        if (!Array.isArray(db.tournaments)) db.tournaments = [];
        if (!Array.isArray(db.reactions)) db.reactions = [];
        console.log("✅ Database loaded from Cloud Storage");
      } else {
        seedData();
        await saveDB();
      }
    } else {
      if (fs.existsSync(DB_FILE)) {
        db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
        if (!Array.isArray(db.admins)) db.admins = [];
        if (!Array.isArray(db.pendingMatches)) db.pendingMatches = [];
        if (!Array.isArray(db.seasons)) db.seasons = [];
        if (!Array.isArray(db.challenges)) db.challenges = [];
        if (!Array.isArray(db.tournaments)) db.tournaments = [];
        if (!Array.isArray(db.reactions)) db.reactions = [];
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

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const isAdmin = db.admins.includes(req.user.uid);
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

// Public: get state (still requires auth but all users can access)
app.get('/api/state', authMiddleware, (req, res) => {
  // Auto-confirm expired pending matches
  const now = Date.now();
  let needsSave = false;
  db.pendingMatches = db.pendingMatches.map(pm => {
    if (pm.status === 'pending' && new Date(pm.expiresAt).getTime() <= now) {
      // Auto-confirm: move to matches
      const delta = calculateMatchDelta(
        pm.type === 'singles' ? (db.players.find(p => p.id === pm.winners[0])?.eloSingles || INITIAL_ELO)
          : pm.winners.reduce((sum, id) => sum + (db.players.find(p => p.id === id)?.eloDoubles || INITIAL_ELO), 0) / pm.winners.length,
        pm.type === 'singles' ? (db.players.find(p => p.id === pm.losers[0])?.eloSingles || INITIAL_ELO)
          : pm.losers.reduce((sum, id) => sum + (db.players.find(p => p.id === id)?.eloDoubles || INITIAL_ELO), 0) / pm.losers.length
      );
      const timestamp = pm.createdAt;
      const historyEntries = [];
      db.players = db.players.map(p => {
        if (pm.winners.includes(p.id)) {
          const newElo = pm.type === 'singles' ? p.eloSingles + delta : p.eloDoubles + delta;
          historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: pm.type });
          return { ...p, eloSingles: pm.type === 'singles' ? newElo : p.eloSingles, eloDoubles: pm.type === 'doubles' ? newElo : p.eloDoubles, wins: p.wins + 1, streak: p.streak >= 0 ? p.streak + 1 : 1 };
        }
        if (pm.losers.includes(p.id)) {
          const newElo = pm.type === 'singles' ? p.eloSingles - delta : p.eloDoubles - delta;
          historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: pm.type });
          return { ...p, eloSingles: pm.type === 'singles' ? newElo : p.eloSingles, eloDoubles: pm.type === 'doubles' ? newElo : p.eloDoubles, losses: p.losses + 1, streak: p.streak <= 0 ? p.streak - 1 : -1 };
        }
        return p;
      });
      db.history.push(...historyEntries);
      const newMatch = { id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers, scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser, timestamp, eloChange: delta, loggedBy: pm.loggedBy };
      db.matches.unshift(newMatch);
      needsSave = true;
      return { ...pm, status: 'confirmed' };
    }
    return pm;
  });
  // Remove confirmed/rejected from pending
  db.pendingMatches = db.pendingMatches.filter(pm => pm.status === 'pending' || pm.status === 'disputed');
  if (needsSave) saveDB();

  res.json({
    players: db.players,
    matches: db.matches,
    history: db.history,
    rackets: db.rackets,
    pendingMatches: db.pendingMatches,
    seasons: db.seasons,
    challenges: db.challenges,
    tournaments: db.tournaments,
    reactions: db.reactions,
  });
});

// --- Auth: /api/me ---
// Returns current user's profile (does NOT auto-create — user must complete setup)
app.get('/api/me', authMiddleware, async (req, res) => {
  const { uid, email, name, picture } = req.user;

  // Auto-promote admin from env var
  if (shouldAutoPromote(email) && !db.admins.includes(uid)) {
    db.admins.push(uid);
    await saveDB();
    console.log(`👑 Auto-promoted admin: ${email}`);
  }

  const isAdmin = db.admins.includes(uid);

  // Find linked player
  const player = db.players.find(p => p.uid === uid) || null;

  const response = {
    uid,
    email,
    displayName: name,
    photoURL: picture,
    isAdmin,
    player,
    needsSetup: !player,
  };

  // Include unclaimed players when user needs setup (for account claiming)
  if (!player) {
    response.unclaimedPlayers = db.players.filter(p => !p.uid);
  }

  res.json(response);
});

// --- Profile Setup (first login) ---
app.post('/api/me/setup', authMiddleware, async (req, res) => {
  const { uid } = req.user;

  // Check if player already exists
  const existing = db.players.find(p => p.uid === uid);
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
    wins: 0,
    losses: 0,
    streak: 0,
    joinedAt: new Date().toISOString(),
    uid,
  };
  db.players.push(player);
  await saveDB();
  console.log(`🆕 Profile created for ${req.user.email}: "${player.name}"`);

  const isAdmin = db.admins.includes(uid);
  res.json({
    uid,
    email: req.user.email,
    displayName: req.user.name,
    photoURL: req.user.picture,
    isAdmin,
    player,
    needsSetup: false,
  });
});

// --- Claim unclaimed player account ---
app.post('/api/me/claim', authMiddleware, async (req, res) => {
  const { uid } = req.user;

  // Check if user already has a player profile
  const existing = db.players.find(p => p.uid === uid);
  if (existing) {
    return res.status(400).json({ error: 'You already have a player profile' });
  }

  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId is required' });

  const playerIdx = db.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const player = db.players[playerIdx];
  if (player.uid) {
    return res.status(400).json({ error: 'This player is already linked to an account' });
  }

  // Claim: link the Firebase UID to the existing player record
  db.players[playerIdx] = { ...player, uid };
  await saveDB();
  console.log(`🔗 Player "${player.name}" claimed by ${req.user.email}`);

  const isAdmin = db.admins.includes(uid);
  res.json({
    uid,
    email: req.user.email,
    displayName: req.user.name,
    photoURL: req.user.picture,
    isAdmin,
    player: db.players[playerIdx],
    needsSetup: false,
  });
});

// --- Edit own profile ---
app.put('/api/me/profile', authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const idx = db.players.findIndex(p => p.uid === uid);
  if (idx === -1) {
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

  db.players[idx] = { ...db.players[idx], ...updates };
  await saveDB();
  res.json(db.players[idx]);
});

// --- Players ---
app.post('/api/players', authMiddleware, async (req, res) => {
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
    wins: 0, losses: 0, streak: 0,
    joinedAt: new Date().toISOString(),
    uid: req.body.uid || undefined,
  };
  db.players.push(newPlayer);
  await saveDB();
  res.json(newPlayer);
});

app.put('/api/players/:id', authMiddleware, async (req, res) => {
  const idx = db.players.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    db.players[idx] = { ...db.players[idx], ...req.body };
    await saveDB();
    res.json(db.players[idx]);
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

app.delete('/api/players/:id', authMiddleware, adminMiddleware, async (req, res) => {
  db.players = db.players.filter(p => p.id !== req.params.id);
  await saveDB();
  res.json({ success: true });
});

// --- Rackets ---
app.post('/api/rackets', authMiddleware, async (req, res) => {
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
  db.rackets.push(newRacket);
  await saveDB();
  res.json(newRacket);
});

app.put('/api/rackets/:id', authMiddleware, async (req, res) => {
  const racket = db.rackets.find(r => r.id === req.params.id);
  if (!racket) return res.status(404).json({ error: 'Racket not found' });

  const { name, icon, color, stats } = req.body;

  if (name !== undefined) {
    const trimmed = (name || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'Racket name cannot be empty' });
    racket.name = trimmed;
  }
  if (icon !== undefined) racket.icon = icon;
  if (color !== undefined) racket.color = color;

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
    racket.stats = validated;
  }

  await saveDB();
  res.json(racket);
});

app.delete('/api/rackets/:id', authMiddleware, adminMiddleware, async (req, res) => {
  db.rackets = db.rackets.filter(r => r.id !== req.params.id);
  db.players = db.players.map(p => p.mainRacketId === req.params.id ? { ...p, mainRacketId: undefined } : p);
  await saveDB();
  res.json({ success: true });
});

// --- Matches ---
app.post('/api/matches', authMiddleware, async (req, res) => {
  const { type, winners, losers, scoreWinner, scoreLoser } = req.body;

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

  const getP = (id) => db.players.find(p => p.id === id);

  // Validate all players exist
  const allIds = [...winners, ...losers];
  for (const id of allIds) {
    if (!getP(id)) {
      return res.status(400).json({ error: `Player with ID "${id}" not found` });
    }
  }

  const timestamp = new Date().toISOString();
  let wElo = 0, lElo = 0;

  if (type === 'singles') {
    wElo = getP(winners[0]).eloSingles;
    lElo = getP(losers[0]).eloSingles;
  } else {
    wElo = (getP(winners[0]).eloDoubles + getP(winners[1]).eloDoubles) / 2;
    lElo = (getP(losers[0]).eloDoubles + getP(losers[1]).eloDoubles) / 2;
  }

  const delta = calculateMatchDelta(wElo, lElo);
  const historyEntries = [];

  db.players = db.players.map(p => {
    if (winners.includes(p.id)) {
      const newElo = type === 'singles' ? p.eloSingles + delta : p.eloDoubles + delta;
      historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: type });
      return { ...p, eloSingles: type === 'singles' ? newElo : p.eloSingles, eloDoubles: type === 'doubles' ? newElo : p.eloDoubles, wins: p.wins + 1, streak: p.streak >= 0 ? p.streak + 1 : 1 };
    }
    if (losers.includes(p.id)) {
      const newElo = type === 'singles' ? p.eloSingles - delta : p.eloDoubles - delta;
      historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: type });
      return { ...p, eloSingles: type === 'singles' ? newElo : p.eloSingles, eloDoubles: type === 'doubles' ? newElo : p.eloDoubles, losses: p.losses + 1, streak: p.streak <= 0 ? p.streak - 1 : -1 };
    }
    return p;
  });

  db.history.push(...historyEntries);
  const newMatch = { id: Date.now().toString(), type, winners, losers, scoreWinner, scoreLoser, timestamp, eloChange: delta, loggedBy: req.user.uid };
  db.matches.unshift(newMatch);
  await saveDB();
  res.json(newMatch);
});

// EDIT match — reverses old ELO and applies new ELO (admin or creator within 60s)
app.put('/api/matches/:id', authMiddleware, async (req, res) => {
  const match = db.matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const isAdmin = db.admins.includes(req.user.uid);
  const isCreator = match.loggedBy && match.loggedBy === req.user.uid;
  const matchAge = Date.now() - new Date(match.timestamp).getTime();
  const withinWindow = matchAge < 60000; // 60 seconds

  if (!isAdmin && !(isCreator && withinWindow)) {
    return res.status(403).json({ error: 'Not authorized to edit this match' });
  }

  const { winners, losers, scoreWinner, scoreLoser } = req.body;

  // Validate inputs
  if (!Array.isArray(winners) || !Array.isArray(losers)) {
    return res.status(400).json({ error: 'Winners and losers must be arrays' });
  }
  if (typeof scoreWinner !== 'number' || typeof scoreLoser !== 'number' || scoreWinner < 0 || scoreLoser < 0) {
    return res.status(400).json({ error: 'Scores must be non-negative numbers' });
  }

  const getP = (id) => db.players.find(p => p.id === id);

  // Validate all new players exist
  const allIds = [...winners, ...losers];
  for (const id of allIds) {
    if (!getP(id)) {
      return res.status(400).json({ error: `Player with ID "${id}" not found` });
    }
  }

  // --- Step 1: Reverse old ELO changes ---
  const oldType = match.type;
  const oldWinners = match.winners;
  const oldLosers = match.losers;
  const oldEloChange = match.eloChange;

  db.players = db.players.map(p => {
    if (oldWinners.includes(p.id)) {
      const restoredElo = oldType === 'singles' ? p.eloSingles - oldEloChange : p.eloDoubles - oldEloChange;
      return {
        ...p,
        eloSingles: oldType === 'singles' ? restoredElo : p.eloSingles,
        eloDoubles: oldType === 'doubles' ? restoredElo : p.eloDoubles,
        wins: Math.max(0, p.wins - 1),
        streak: 0
      };
    }
    if (oldLosers.includes(p.id)) {
      const restoredElo = oldType === 'singles' ? p.eloSingles + oldEloChange : p.eloDoubles + oldEloChange;
      return {
        ...p,
        eloSingles: oldType === 'singles' ? restoredElo : p.eloSingles,
        eloDoubles: oldType === 'doubles' ? restoredElo : p.eloDoubles,
        losses: Math.max(0, p.losses - 1),
        streak: 0
      };
    }
    return p;
  });

  // Remove old history entries
  db.history = db.history.filter(h => h.matchId !== match.timestamp);

  // --- Step 2: Apply new ELO changes ---
  const type = match.type; // type stays the same
  let wElo = 0, lElo = 0;

  if (type === 'singles') {
    wElo = getP(winners[0]).eloSingles;
    lElo = getP(losers[0]).eloSingles;
  } else {
    wElo = (getP(winners[0]).eloDoubles + getP(winners[1]).eloDoubles) / 2;
    lElo = (getP(losers[0]).eloDoubles + getP(losers[1]).eloDoubles) / 2;
  }

  const newDelta = calculateMatchDelta(wElo, lElo);
  const newTimestamp = match.timestamp; // keep original timestamp
  const historyEntries = [];

  db.players = db.players.map(p => {
    if (winners.includes(p.id)) {
      const newElo = type === 'singles' ? p.eloSingles + newDelta : p.eloDoubles + newDelta;
      historyEntries.push({ playerId: p.id, matchId: newTimestamp, newElo, timestamp: newTimestamp, gameType: type });
      return { ...p, eloSingles: type === 'singles' ? newElo : p.eloSingles, eloDoubles: type === 'doubles' ? newElo : p.eloDoubles, wins: p.wins + 1, streak: p.streak >= 0 ? p.streak + 1 : 1 };
    }
    if (losers.includes(p.id)) {
      const newElo = type === 'singles' ? p.eloSingles - newDelta : p.eloDoubles - newDelta;
      historyEntries.push({ playerId: p.id, matchId: newTimestamp, newElo, timestamp: newTimestamp, gameType: type });
      return { ...p, eloSingles: type === 'singles' ? newElo : p.eloSingles, eloDoubles: type === 'doubles' ? newElo : p.eloDoubles, losses: p.losses + 1, streak: p.streak <= 0 ? p.streak - 1 : -1 };
    }
    return p;
  });

  db.history.push(...historyEntries);

  // Update the match record
  const matchIdx = db.matches.findIndex(m => m.id === req.params.id);
  db.matches[matchIdx] = {
    ...match,
    winners,
    losers,
    scoreWinner,
    scoreLoser,
    eloChange: newDelta,
  };

  await saveDB();
  res.json(db.matches[matchIdx]);
});

// DELETE match — reverses ELO changes (admin or creator within 60s)
app.delete('/api/matches/:id', authMiddleware, async (req, res) => {
  const match = db.matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const isAdmin = db.admins.includes(req.user.uid);
  const isCreator = match.loggedBy && match.loggedBy === req.user.uid;
  const matchAge = Date.now() - new Date(match.timestamp).getTime();
  const withinWindow = matchAge < 60000; // 60 seconds

  if (!isAdmin && !(isCreator && withinWindow)) {
    return res.status(403).json({ error: 'Not authorized to delete this match' });
  }

  const { type, winners, losers, eloChange } = match;

  // Reverse ELO and W/L for each player involved
  db.players = db.players.map(p => {
    if (winners.includes(p.id)) {
      const restoredElo = type === 'singles' ? p.eloSingles - eloChange : p.eloDoubles - eloChange;
      return {
        ...p,
        eloSingles: type === 'singles' ? restoredElo : p.eloSingles,
        eloDoubles: type === 'doubles' ? restoredElo : p.eloDoubles,
        wins: Math.max(0, p.wins - 1),
        streak: 0
      };
    }
    if (losers.includes(p.id)) {
      const restoredElo = type === 'singles' ? p.eloSingles + eloChange : p.eloDoubles + eloChange;
      return {
        ...p,
        eloSingles: type === 'singles' ? restoredElo : p.eloSingles,
        eloDoubles: type === 'doubles' ? restoredElo : p.eloDoubles,
        losses: Math.max(0, p.losses - 1),
        streak: 0
      };
    }
    return p;
  });

  db.matches = db.matches.filter(m => m.id !== req.params.id);
  db.history = db.history.filter(h => h.matchId !== match.timestamp);

  await saveDB();
  res.json({ success: true });
});

// Export league data
app.get('/api/export', authMiddleware, (req, res) => {
  res.json({ players: db.players, matches: db.matches, history: db.history, rackets: db.rackets });
});

// Import league data (admin only)
app.post('/api/import', authMiddleware, adminMiddleware, async (req, res) => {
  const { players, matches, history, rackets } = req.body;
  if (!Array.isArray(players) || !Array.isArray(matches)) {
    return res.status(400).json({ error: 'Invalid import data: players and matches must be arrays' });
  }
  db.players = players;
  db.matches = matches;
  db.history = Array.isArray(history) ? history : [];
  db.rackets = Array.isArray(rackets) ? rackets : [];
  await saveDB();
  res.json({ success: true });
});

// Reset (admin only)
app.post('/api/reset', authMiddleware, adminMiddleware, async (req, res) => {
  if (req.body.mode === 'season') {
    db.players = db.players.map(p => ({ ...p, eloSingles: INITIAL_ELO, eloDoubles: INITIAL_ELO, wins: 0, losses: 0, streak: 0 }));
    db.matches = []; db.history = [];
  } else if (req.body.mode === 'fresh') {
    db.players = []; db.matches = []; db.history = []; db.rackets = [];
  } else {
    seedData();
  }
  await saveDB();
  res.json({ success: true });
});

// --- Admin Endpoints ---
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  // Return all players with their admin status
  const users = db.players
    .filter(p => p.uid) // Only players linked to accounts
    .map(p => ({
      uid: p.uid,
      name: p.name,
      avatar: p.avatar,
      isAdmin: db.admins.includes(p.uid),
    }));
  res.json(users);
});

app.post('/api/admin/promote', authMiddleware, adminMiddleware, async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid is required' });
  if (!db.admins.includes(uid)) {
    db.admins.push(uid);
    await saveDB();
  }
  res.json({ success: true });
});

app.post('/api/admin/demote', authMiddleware, adminMiddleware, async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid is required' });
  // Don't allow demoting yourself
  if (uid === req.user.uid) {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }
  db.admins = db.admins.filter(a => a !== uid);
  await saveDB();
  res.json({ success: true });
});

// --- Pending Match Confirmation ---
app.post('/api/pending-matches', authMiddleware, async (req, res) => {
  const { type, winners, losers, scoreWinner, scoreLoser } = req.body;
  if (!type || !['singles', 'doubles'].includes(type)) return res.status(400).json({ error: 'Invalid game type' });
  if (!Array.isArray(winners) || !Array.isArray(losers)) return res.status(400).json({ error: 'Winners and losers must be arrays' });

  const getP = (id) => db.players.find(p => p.id === id);
  for (const id of [...winners, ...losers]) {
    if (!getP(id)) return res.status(400).json({ error: `Player "${id}" not found` });
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
  db.pendingMatches.push(pending);
  await saveDB();
  res.json(pending);
});

app.put('/api/pending-matches/:id/confirm', authMiddleware, async (req, res) => {
  const pm = db.pendingMatches.find(m => m.id === req.params.id);
  if (!pm) return res.status(404).json({ error: 'Pending match not found' });
  if (pm.status !== 'pending') return res.status(400).json({ error: 'Match is not pending' });

  if (!pm.confirmations.includes(req.user.uid)) {
    pm.confirmations.push(req.user.uid);
  }

  // Check if all involved players (with accounts) have confirmed
  const involvedUids = [...pm.winners, ...pm.losers]
    .map(id => db.players.find(p => p.id === id)?.uid)
    .filter(Boolean);
  const allConfirmed = involvedUids.every(uid => pm.confirmations.includes(uid));

  if (allConfirmed || involvedUids.length <= 1) {
    // Move to confirmed: create actual match with ELO
    const getP = (id) => db.players.find(p => p.id === id);
    let wElo = 0, lElo = 0;
    if (pm.type === 'singles') {
      wElo = getP(pm.winners[0]).eloSingles;
      lElo = getP(pm.losers[0]).eloSingles;
    } else {
      wElo = pm.winners.reduce((s, id) => s + getP(id).eloDoubles, 0) / pm.winners.length;
      lElo = pm.losers.reduce((s, id) => s + getP(id).eloDoubles, 0) / pm.losers.length;
    }
    const delta = calculateMatchDelta(wElo, lElo);
    const timestamp = pm.createdAt;
    const historyEntries = [];
    db.players = db.players.map(p => {
      if (pm.winners.includes(p.id)) {
        const newElo = pm.type === 'singles' ? p.eloSingles + delta : p.eloDoubles + delta;
        historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: pm.type });
        return { ...p, eloSingles: pm.type === 'singles' ? newElo : p.eloSingles, eloDoubles: pm.type === 'doubles' ? newElo : p.eloDoubles, wins: p.wins + 1, streak: p.streak >= 0 ? p.streak + 1 : 1 };
      }
      if (pm.losers.includes(p.id)) {
        const newElo = pm.type === 'singles' ? p.eloSingles - delta : p.eloDoubles - delta;
        historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: pm.type });
        return { ...p, eloSingles: pm.type === 'singles' ? newElo : p.eloSingles, eloDoubles: pm.type === 'doubles' ? newElo : p.eloDoubles, losses: p.losses + 1, streak: p.streak <= 0 ? p.streak - 1 : -1 };
      }
      return p;
    });
    db.history.push(...historyEntries);
    const newMatch = { id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers, scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser, timestamp, eloChange: delta, loggedBy: pm.loggedBy };
    db.matches.unshift(newMatch);
    db.pendingMatches = db.pendingMatches.filter(m => m.id !== pm.id);
    pm.status = 'confirmed';
    await saveDB();
    return res.json({ ...pm, match: newMatch });
  }

  await saveDB();
  res.json(pm);
});

app.put('/api/pending-matches/:id/dispute', authMiddleware, async (req, res) => {
  const pm = db.pendingMatches.find(m => m.id === req.params.id);
  if (!pm) return res.status(404).json({ error: 'Pending match not found' });
  pm.status = 'disputed';
  await saveDB();
  res.json(pm);
});

app.put('/api/pending-matches/:id/force-confirm', authMiddleware, adminMiddleware, async (req, res) => {
  const pm = db.pendingMatches.find(m => m.id === req.params.id);
  if (!pm) return res.status(404).json({ error: 'Pending match not found' });

  const getP = (id) => db.players.find(p => p.id === id);
  let wElo = 0, lElo = 0;
  if (pm.type === 'singles') {
    wElo = getP(pm.winners[0]).eloSingles; lElo = getP(pm.losers[0]).eloSingles;
  } else {
    wElo = pm.winners.reduce((s, id) => s + getP(id).eloDoubles, 0) / pm.winners.length;
    lElo = pm.losers.reduce((s, id) => s + getP(id).eloDoubles, 0) / pm.losers.length;
  }
  const delta = calculateMatchDelta(wElo, lElo);
  const timestamp = pm.createdAt;
  const historyEntries = [];
  db.players = db.players.map(p => {
    if (pm.winners.includes(p.id)) {
      const newElo = pm.type === 'singles' ? p.eloSingles + delta : p.eloDoubles + delta;
      historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: pm.type });
      return { ...p, eloSingles: pm.type === 'singles' ? newElo : p.eloSingles, eloDoubles: pm.type === 'doubles' ? newElo : p.eloDoubles, wins: p.wins + 1, streak: p.streak >= 0 ? p.streak + 1 : 1 };
    }
    if (pm.losers.includes(p.id)) {
      const newElo = pm.type === 'singles' ? p.eloSingles - delta : p.eloDoubles - delta;
      historyEntries.push({ playerId: p.id, matchId: timestamp, newElo, timestamp, gameType: pm.type });
      return { ...p, eloSingles: pm.type === 'singles' ? newElo : p.eloSingles, eloDoubles: pm.type === 'doubles' ? newElo : p.eloDoubles, losses: p.losses + 1, streak: p.streak <= 0 ? p.streak - 1 : -1 };
    }
    return p;
  });
  db.history.push(...historyEntries);
  const newMatch = { id: pm.id, type: pm.type, winners: pm.winners, losers: pm.losers, scoreWinner: pm.scoreWinner, scoreLoser: pm.scoreLoser, timestamp, eloChange: delta, loggedBy: pm.loggedBy };
  db.matches.unshift(newMatch);
  db.pendingMatches = db.pendingMatches.filter(m => m.id !== pm.id);
  await saveDB();
  res.json({ ...pm, status: 'confirmed', match: newMatch });
});

app.delete('/api/pending-matches/:id', authMiddleware, adminMiddleware, async (req, res) => {
  db.pendingMatches = db.pendingMatches.filter(m => m.id !== req.params.id);
  await saveDB();
  res.json({ success: true });
});

// --- Seasons ---
app.get('/api/seasons', authMiddleware, (req, res) => {
  res.json(db.seasons);
});

app.post('/api/seasons/start', authMiddleware, adminMiddleware, async (req, res) => {
  const activeSeason = db.seasons.find(s => s.status === 'active');
  if (activeSeason) return res.status(400).json({ error: 'A season is already active. End it first.' });

  const seasonNumber = db.seasons.length + 1;
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
  db.players = db.players.map(p => ({
    ...p, eloSingles: INITIAL_ELO, eloDoubles: INITIAL_ELO,
    wins: 0, losses: 0, streak: 0,
  }));
  db.matches = [];
  db.history = [];
  db.seasons.push(season);
  await saveDB();
  res.json(season);
});

app.post('/api/seasons/end', authMiddleware, adminMiddleware, async (req, res) => {
  const idx = db.seasons.findIndex(s => s.status === 'active');
  if (idx === -1) return res.status(400).json({ error: 'No active season to end' });

  const standings = [...db.players]
    .sort((a, b) => b.eloSingles - a.eloSingles)
    .map((p, i) => ({
      playerId: p.id, playerName: p.name, rank: i + 1,
      eloSingles: p.eloSingles, eloDoubles: p.eloDoubles,
      wins: p.wins, losses: p.losses,
    }));

  db.seasons[idx] = {
    ...db.seasons[idx],
    status: 'completed',
    endedAt: new Date().toISOString(),
    finalStandings: standings,
    matchCount: db.matches.length,
    championId: standings.length > 0 ? standings[0].playerId : undefined,
  };
  await saveDB();
  res.json(db.seasons[idx]);
});

// --- Challenges ---
app.get('/api/challenges', authMiddleware, (req, res) => {
  res.json(db.challenges);
});

app.post('/api/challenges', authMiddleware, async (req, res) => {
  const { challengedId, wager, message } = req.body;
  const challengerPlayer = db.players.find(p => p.uid === req.user.uid);
  if (!challengerPlayer) return res.status(400).json({ error: 'You need a player profile first' });

  const challenged = db.players.find(p => p.id === challengedId);
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
  db.challenges.push(challenge);
  await saveDB();
  res.json(challenge);
});

app.put('/api/challenges/:id/respond', authMiddleware, async (req, res) => {
  const challenge = db.challenges.find(c => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const userPlayer = db.players.find(p => p.uid === req.user.uid);
  if (!userPlayer || userPlayer.id !== challenge.challengedId) {
    return res.status(403).json({ error: 'Only the challenged player can respond' });
  }
  if (challenge.status !== 'pending') return res.status(400).json({ error: 'Challenge is no longer pending' });

  const { accept } = req.body;
  challenge.status = accept ? 'accepted' : 'declined';
  await saveDB();
  res.json(challenge);
});

app.put('/api/challenges/:id/complete', authMiddleware, async (req, res) => {
  const challenge = db.challenges.find(c => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  if (challenge.status !== 'accepted') return res.status(400).json({ error: 'Challenge must be accepted first' });

  const { matchId } = req.body;
  challenge.matchId = matchId;
  challenge.status = 'completed';

  // Apply wager bonus if applicable
  if (challenge.wager > 0 && matchId) {
    const match = db.matches.find(m => m.id === matchId);
    if (match) {
      const wagerPlayers = [challenge.challengerId, challenge.challengedId];
      db.players = db.players.map(p => {
        if (match.winners.includes(p.id) && wagerPlayers.includes(p.id)) {
          return { ...p, eloSingles: p.eloSingles + challenge.wager };
        }
        if (match.losers.includes(p.id) && wagerPlayers.includes(p.id)) {
          return { ...p, eloSingles: Math.max(0, p.eloSingles - challenge.wager) };
        }
        return p;
      });
    }
  }

  await saveDB();
  res.json(challenge);
});

app.delete('/api/challenges/:id', authMiddleware, async (req, res) => {
  const challenge = db.challenges.find(c => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  const userPlayer = db.players.find(p => p.uid === req.user.uid);
  const isAdmin = db.admins.includes(req.user.uid);
  if (!isAdmin && (!userPlayer || userPlayer.id !== challenge.challengerId)) {
    return res.status(403).json({ error: 'Only the challenger or admin can cancel' });
  }
  db.challenges = db.challenges.filter(c => c.id !== req.params.id);
  await saveDB();
  res.json({ success: true });
});

// --- Tournaments ---
app.get('/api/tournaments', authMiddleware, (req, res) => {
  res.json(db.tournaments);
});

app.post('/api/tournaments', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, format, gameType, playerIds } = req.body;
  if (!name || !format || !gameType || !Array.isArray(playerIds)) {
    return res.status(400).json({ error: 'name, format, gameType, and playerIds are required' });
  }
  if (!['single_elimination', 'round_robin'].includes(format)) {
    return res.status(400).json({ error: 'Format must be single_elimination or round_robin' });
  }
  if (playerIds.length < 2) return res.status(400).json({ error: 'At least 2 players required' });

  // Validate all players exist
  for (const id of playerIds) {
    if (!db.players.find(p => p.id === id)) {
      return res.status(400).json({ error: `Player "${id}" not found` });
    }
  }

  // Generate rounds
  let rounds = [];
  if (format === 'single_elimination') {
    // Seed by ELO
    const eloKey = gameType === 'singles' ? 'eloSingles' : 'eloDoubles';
    const seeded = playerIds
      .map(id => db.players.find(p => p.id === id))
      .sort((a, b) => b[eloKey] - a[eloKey])
      .map(p => p.id);

    // Pad to next power of 2
    let size = 1;
    while (size < seeded.length) size *= 2;
    while (seeded.length < size) seeded.push(null); // BYEs

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
        // Advance to next round
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
    // Split into rounds (simple round-robin scheduling)
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
  db.tournaments.push(tournament);
  await saveDB();
  res.json(tournament);
});

app.put('/api/tournaments/:id/result', authMiddleware, async (req, res) => {
  const tournament = db.tournaments.find(t => t.id === req.params.id);
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
  if (allComplete) {
    tournament.status = 'completed';
    tournament.completedAt = new Date().toISOString();
    if (tournament.format === 'single_elimination') {
      const finalRound = tournament.rounds[tournament.rounds.length - 1];
      tournament.winnerId = finalRound.matchups[0]?.winnerId;
    } else {
      // Round robin: winner is player with most wins
      const winCounts = {};
      allMatchups.forEach(m => { winCounts[m.winnerId] = (winCounts[m.winnerId] || 0) + 1; });
      const sorted = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);
      tournament.winnerId = sorted[0]?.[0];
    }
  }

  await saveDB();
  res.json(tournament);
});

app.put('/api/tournaments/:id/players', authMiddleware, adminMiddleware, async (req, res) => {
  const tournament = db.tournaments.find(t => t.id === req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  if (tournament.status !== 'registration') return res.status(400).json({ error: 'Can only modify players during registration' });
  const { playerIds } = req.body;
  if (!Array.isArray(playerIds) || playerIds.length < 2) return res.status(400).json({ error: 'At least 2 players required' });
  tournament.playerIds = playerIds;
  await saveDB();
  res.json(tournament);
});

app.delete('/api/tournaments/:id', authMiddleware, adminMiddleware, async (req, res) => {
  db.tournaments = db.tournaments.filter(t => t.id !== req.params.id);
  await saveDB();
  res.json({ success: true });
});

// --- Match Reactions ---
app.post('/api/matches/:id/reactions', authMiddleware, async (req, res) => {
  const match = db.matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { type, content } = req.body;
  if (!type || !content) return res.status(400).json({ error: 'type and content are required' });
  if (type === 'comment' && content.length > 200) return res.status(400).json({ error: 'Comment too long (200 char max)' });

  // For emoji reactions, toggle (remove if exists, add if not)
  if (type === 'emoji') {
    const existing = db.reactions.findIndex(r => r.matchId === req.params.id && r.userId === req.user.uid && r.type === 'emoji' && r.content === content);
    if (existing !== -1) {
      db.reactions.splice(existing, 1);
      await saveDB();
      return res.json({ removed: true });
    }
  }

  const reaction = {
    id: Date.now().toString(),
    matchId: req.params.id,
    userId: req.user.uid,
    type,
    content: content.substring(0, 200),
    createdAt: new Date().toISOString(),
  };
  db.reactions.push(reaction);
  await saveDB();
  res.json(reaction);
});

app.delete('/api/matches/:id/reactions/:reactionId', authMiddleware, async (req, res) => {
  const reaction = db.reactions.find(r => r.id === req.params.reactionId && r.matchId === req.params.id);
  if (!reaction) return res.status(404).json({ error: 'Reaction not found' });
  if (reaction.userId !== req.user.uid && !db.admins.includes(req.user.uid)) {
    return res.status(403).json({ error: 'Can only remove your own reactions' });
  }
  db.reactions = db.reactions.filter(r => r.id !== req.params.reactionId);
  await saveDB();
  res.json({ success: true });
});

// --- Player of the Week ---
app.get('/api/player-of-week', authMiddleware, (req, res) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekMatches = db.matches.filter(m => new Date(m.timestamp) >= weekStart);
  if (weekMatches.length === 0) return res.json({ player: null, stats: null });

  const scores = {};
  db.players.forEach(p => {
    const wins = weekMatches.filter(m => m.winners.includes(p.id)).length;
    const losses = weekMatches.filter(m => m.losers.includes(p.id)).length;
    const eloGained = weekMatches.filter(m => m.winners.includes(p.id)).reduce((sum, m) => sum + m.eloChange, 0);
    const streak = Math.max(0, p.streak);
    const score = (wins * 3) + (eloGained * 0.5) + (streak * 2);
    if (wins + losses > 0) {
      scores[p.id] = { playerId: p.id, wins, losses, matches: wins + losses, eloGained, score, winRate: wins / (wins + losses) };
    }
  });

  const sorted = Object.values(scores).sort((a, b) => b.score - a.score || b.winRate - a.winRate || b.matches - a.matches);
  if (sorted.length === 0) return res.json({ player: null, stats: null });

  const winner = sorted[0];
  const player = db.players.find(p => p.id === winner.playerId);
  res.json({ player, stats: winner });
});

// --- Hall of Fame ---
app.get('/api/hall-of-fame', authMiddleware, (req, res) => {
  const records = {};

  // Highest ELO ever (singles)
  if (db.history.length > 0) {
    const singlesHistory = db.history.filter(h => h.gameType === 'singles');
    if (singlesHistory.length > 0) {
      const best = singlesHistory.reduce((max, h) => h.newElo > max.newElo ? h : max);
      const player = db.players.find(p => p.id === best.playerId);
      records.highestEloSingles = { playerId: best.playerId, playerName: player?.name, value: best.newElo, date: best.timestamp };
    }
    const doublesHistory = db.history.filter(h => h.gameType === 'doubles');
    if (doublesHistory.length > 0) {
      const best = doublesHistory.reduce((max, h) => h.newElo > max.newElo ? h : max);
      const player = db.players.find(p => p.id === best.playerId);
      records.highestEloDoubles = { playerId: best.playerId, playerName: player?.name, value: best.newElo, date: best.timestamp };
    }
  }

  // Most matches played
  if (db.players.length > 0) {
    const most = [...db.players].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))[0];
    records.mostMatchesPlayed = { playerId: most.id, playerName: most.name, value: most.wins + most.losses };
  }

  // Best win rate (min 20 matches)
  const qualified = db.players.filter(p => p.wins + p.losses >= 20);
  if (qualified.length > 0) {
    const best = qualified.sort((a, b) => (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses)))[0];
    records.bestWinRate = { playerId: best.id, playerName: best.name, value: Math.round(100 * best.wins / (best.wins + best.losses)) };
  }

  // Highest single-match ELO gain
  if (db.matches.length > 0) {
    const best = [...db.matches].sort((a, b) => b.eloChange - a.eloChange)[0];
    records.highestEloGain = { matchId: best.id, value: best.eloChange, winners: best.winners.map(id => db.players.find(p => p.id === id)?.name || 'Unknown') };
  }

  // Most dominant victory (score margin)
  if (db.matches.length > 0) {
    const best = [...db.matches].sort((a, b) => (b.scoreWinner - b.scoreLoser) - (a.scoreWinner - a.scoreLoser))[0];
    records.mostDominantVictory = { matchId: best.id, score: `${best.scoreWinner}-${best.scoreLoser}`, margin: best.scoreWinner - best.scoreLoser, winners: best.winners.map(id => db.players.find(p => p.id === id)?.name || 'Unknown') };
  }

  res.json(records);
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
loadDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (ADMIN_EMAILS.length > 0) {
      console.log(`👑 Admin emails: ${ADMIN_EMAILS.join(', ')}`);
    }
  });
});
