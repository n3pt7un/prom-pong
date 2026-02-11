import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { isSupabaseEnabled } from '../lib/supabase.ts';
import { PORT, GCS_BUCKET, ADMIN_EMAILS } from './config.js';
import { loadDB } from './db/persistence.js';

import stateRoutes from './routes/state.js';
import meRoutes from './routes/me.js';
import playersRoutes from './routes/players.js';
import racketsRoutes from './routes/rackets.js';
import matchesRoutes from './routes/matches.js';
import pendingMatchesRoutes from './routes/pending-matches.js';
import seasonsRoutes from './routes/seasons.js';
import challengesRoutes from './routes/challenges.js';
import tournamentsRoutes from './routes/tournaments.js';
import leaguesRoutes from './routes/leagues.js';
import adminRoutes from './routes/admin.js';
import exportImportRoutes from './routes/export-import.js';
import featuresRoutes from './routes/features.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  admin.initializeApp({});
  console.log('🔐 Firebase Admin SDK initialized');
} catch (err) {
  console.error('⚠️ Firebase Admin SDK init failed:', err.message);
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

app.use(express.static(path.join(__dirname, '..', 'dist')));

if (isSupabaseEnabled()) {
  console.log('📊 Using Supabase PostgreSQL database');
} else if (GCS_BUCKET) {
  console.log('☁️ Using Google Cloud Storage (JSON file mode)');
} else {
  console.log('💻 Using local filesystem (JSON file mode)');
}

app.use('/api', stateRoutes);
app.use('/api', meRoutes);
app.use('/api', playersRoutes);
app.use('/api', racketsRoutes);
app.use('/api', matchesRoutes);
app.use('/api', pendingMatchesRoutes);
app.use('/api', seasonsRoutes);
app.use('/api', challengesRoutes);
app.use('/api', tournamentsRoutes);
app.use('/api', leaguesRoutes);
app.use('/api', adminRoutes);
app.use('/api', exportImportRoutes);
app.use('/api', featuresRoutes);

app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else {
    res.status(404).send('CyberPong Backend: 404 Not Found. If testing in dev, ensure server is running.');
  }
});

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
