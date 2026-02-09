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
  admins: [] // Array of UIDs
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
        // Ensure admins array exists for old databases
        if (!Array.isArray(db.admins)) db.admins = [];
        console.log("✅ Database loaded from Cloud Storage");
      } else {
        seedData();
        await saveDB();
      }
    } else {
      if (fs.existsSync(DB_FILE)) {
        db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
        if (!Array.isArray(db.admins)) db.admins = [];
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
app.get('/api/state', authMiddleware, (req, res) => res.json({
  players: db.players,
  matches: db.matches,
  history: db.history,
  rackets: db.rackets,
}));

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

  res.json({
    uid,
    email,
    displayName: name,
    photoURL: picture,
    isAdmin,
    player,
    needsSetup: !player,
  });
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
  const newMatch = { id: Date.now().toString(), type, winners, losers, scoreWinner, scoreLoser, timestamp, eloChange: delta };
  db.matches.unshift(newMatch);
  await saveDB();
  res.json(newMatch);
});

// DELETE match — reverses ELO changes (admin only)
app.delete('/api/matches/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const match = db.matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

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
