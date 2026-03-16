import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { isSupabaseEnabled } from '../lib/supabase.js';
import { PORT, GCS_BUCKET, ADMIN_EMAILS } from './config.js';
import { loadDB } from './db/persistence.js';
import { validateRuntimeGuardrails } from './security/runtime-guards.js';

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
import correctionsRoutes from './routes/corrections.js';
import insightsRoutes from './routes/insights.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  admin.initializeApp({});
  console.log('🔐 Firebase Admin SDK initialized');
} catch (err) {
  console.error('⚠️ Firebase Admin SDK init failed:', err.message);
}

const app = express();

app.use(helmet({
  // Firebase signInWithPopup requires window.opener access between our app and
  // the firebaseapp.com popup. COOP: same-origin (Helmet's default) severs that
  // link, so the popup can't postMessage the auth result back → popup-closed-by-user.
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://apis.google.com', 'https://*.firebaseapp.com'],
      frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.firebaseapp.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
    },
  },
}));
app.use(compression());

// Serve static files before CORS so asset requests don't require a matching Origin
app.use(express.static(path.join(__dirname, '..', 'dist')));

const rawOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const allowedOrigins = new Set([
  ...rawOrigins,
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'] : []),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

if (isSupabaseEnabled()) {
  console.log('📊 Using Supabase PostgreSQL database');
} else if (GCS_BUCKET) {
  console.log('☁️ Using Google Cloud Storage (JSON file mode)');
} else {
  console.log('💻 Using local filesystem (JSON file mode)');
}

// Trust Cloud Run's load balancer so rate limiting uses real client IPs
app.set('trust proxy', 1);

// General API limiter: 120 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Mutation limiter: 30 writes per minute per IP
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', generalLimiter);
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return mutationLimiter(req, res, next);
  }
  next();
});

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
app.use('/api', correctionsRoutes);
app.use('/api', insightsRoutes);

app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else {
    res.status(404).send('CyberPong Backend: 404 Not Found. If testing in dev, ensure server is running.');
  }
});

const startServer = async () => {
  // Fail-fast: validate runtime guardrails before loading DB or listening
  const guard = validateRuntimeGuardrails();
  if (!guard.ok) {
    console.error('[SECURITY] Unsafe environment configuration detected. Server will not start.');
    console.error(`[SECURITY] Reason: ${guard.reason}`);
    console.error('[SECURITY] Resolved env values:', JSON.stringify(guard.values));
    process.exit(1);
  }
  if (guard.bypass) {
    console.warn('[SECURITY] WARNING: Local-dev auth bypass is ACTIVE.');
    console.warn('[SECURITY] Bypass context:', JSON.stringify(guard.values));
    console.warn('[SECURITY] All API requests will be authenticated as dev@local.test — do not use in production.');
  }

  if (!isSupabaseEnabled()) {
    await loadDB();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    if (ADMIN_EMAILS.length > 0) {
      console.log(`Admin emails: ${ADMIN_EMAILS.join(', ')}`);
    }
  });
};

startServer();
