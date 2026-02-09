# Cyber-Pong Arcade League

A cyberpunk-themed ping pong league tracker with ELO rankings, player profiles, custom racket forging, matchmaking, and Google Sign-In authentication. Built with React + Express, deployed on Google Cloud Run (free tier).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Firebase Setup](#firebase-setup)
- [Environment Variables](#environment-variables)
- [Deployment (Google Cloud Run)](#deployment-google-cloud-run)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [ELO System](#elo-system)
- [Racket System](#racket-system)
- [Authentication & Authorization](#authentication--authorization)
- [Data Model](#data-model)
- [Achievements](#achievements)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Features

- **ELO-based Rankings** -- Separate singles and doubles ELO ratings with K-factor 32
- **Google Sign-In** -- Firebase Authentication with role-based access (admin / regular)
- **Player Profiles** -- Custom username, avatar (upload or preset), bio, achievements, performance charts
- **Unified Players Hub** -- Browse all players in a grid with quick stats; click to view full profile or compare two players head-to-head
- **Clickable Leaderboard** -- Click any player in the rankings to jump to their profile
- **Match Logging** -- Log 1v1 or 2v2 matches with score validation and undo support
- **Smart Matchmaking** -- Suggests balanced pairings based on ELO proximity (singles and doubles)
- **Racket Armory** -- Forge custom rackets with 6 stats (Speed, Spin, Power, Control, Defense, Chaos), icons, and colors. Edit existing rackets. 30-point stat budget system.
- **Admin Controls** -- Season reset, factory reset, data export/import, player deletion, user promotion/demotion, rename any player
- **No-Racket Prompt** -- Users without a racket see a prompt to forge or equip one
- **Achievements** -- First Blood, On Fire, Unstoppable, Veteran, Century, Elo Climber, Master, Comeback Kid
- **Responsive UI** -- Fully responsive cyberpunk design with glass morphism, neon effects, and mobile-first navigation
- **Free Tier Deployment** -- Runs entirely on Google Cloud Run free tier

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS (CDN), Recharts, Lucide Icons |
| Build Tool | Vite 5 |
| Backend | Express 4, Node 22 |
| Auth | Firebase Authentication (Google Sign-In) |
| Auth (Server) | Firebase Admin SDK (JWT verification) |
| Data Store | Local `db.json` (dev) / Google Cloud Storage (prod) |
| Deployment | Google Cloud Run via Dockerfile |
| Container | Multi-stage Docker build (Node 22 + Node 22-slim) |

---

## Project Structure

```
test-pong/
└── source/                     # All application code
    ├── Dockerfile              # Multi-stage Docker build
    ├── package.json            # Dependencies and scripts
    ├── server.js               # Express backend (API + static serving)
    ├── vite.config.ts          # Vite config with API proxy
    ├── tsconfig.json           # TypeScript config
    ├── index.html              # HTML entry + Tailwind config + CSS
    ├── index.tsx               # React entry point
    ├── App.tsx                 # Root component, routing, state management
    ├── types.ts                # TypeScript interfaces
    ├── constants.ts            # Ranks, avatars, racket presets, stat budget
    ├── achievements.ts         # Achievement definitions and evaluation
    ├── firebaseConfig.ts       # Firebase web SDK initialization
    ├── .env                    # Environment variables (not committed)
    ├── .env.example            # Template for environment variables
    ├── .gcloudignore           # Files to exclude from Cloud Build
    ├── db.json                 # Local database (dev only, gitignored)
    ├── components/
    │   ├── Layout.tsx          # Nav bar, tabs, background effects
    │   ├── Leaderboard.tsx     # Rankings table with ELO info panel
    │   ├── PlayersHub.tsx      # Unified player grid + profile + compare
    │   ├── PlayerProfile.tsx   # Detailed player stats, chart, achievements
    │   ├── MatchLogger.tsx     # Match submission form
    │   ├── MatchMaker.tsx      # Smart matchmaking suggestions
    │   ├── RacketManager.tsx   # Racket creation, editing, info guide
    │   ├── CreatePlayerForm.tsx# New player modal
    │   ├── LoginScreen.tsx     # Google Sign-In screen
    │   ├── ProfileSetup.tsx    # First-login profile creation
    │   ├── RecentMatches.tsx   # Match history feed
    │   ├── RankBadge.tsx       # Rank tier badge component
    │   ├── Settings.tsx        # Admin tools, profile editing
    │   └── StatsDashboard.tsx  # (Legacy, replaced by PlayersHub)
    ├── services/
    │   ├── authService.ts      # Firebase auth operations
    │   ├── storageService.ts   # API client (all REST calls)
    │   └── eloService.ts       # Client-side ELO utilities
    └── utils/
        └── imageUtils.ts       # Client-side image resizing for avatars
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js 22+** (recommended: use `nvm`)
- **A Google Cloud project** with Firebase enabled
- **gcloud CLI** installed and authenticated

### 1. Clone and install

```bash
cd source
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Firebase config values (see [Firebase Setup](#firebase-setup)).

### 3. Authenticate for Firebase Admin SDK (local)

```bash
gcloud auth application-default login
```

This provides Application Default Credentials so the server can verify Firebase tokens locally.

### 4. Start development

```bash
npm run dev
```

This starts **both** the Vite dev server (port 5173) and the Express backend (port 8080) concurrently. The Vite dev server proxies `/api/*` requests to the backend.

Open `http://localhost:5173` in your browser.

### 5. Build for production (optional)

```bash
npm run build      # Creates dist/ folder
npm start          # Runs server.js serving dist/ on port 8080
```

---

## Firebase Setup

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" (or use an existing GCP project)
3. Enable **Google Analytics** (optional)

### 2. Enable Google Sign-In

1. Go to **Authentication** > **Sign-in method**
2. Enable **Google** provider
3. Set a support email

### 3. Register a Web App

1. Go to **Project Settings** > **General** > **Your apps**
2. Click "Add app" > Web (`</>`)
3. Register the app (no Firebase Hosting needed)
4. Copy the `firebaseConfig` object values into your `.env` file

### 4. Add Authorized Domains

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add your domains:
   - `localhost` (for local dev)
   - Your Cloud Run URL (e.g., `cyber-pong-arcade-league-XXXXXXXXXX.europe-west1.run.app`)

### 5. Firebase Admin SDK

The server uses **Application Default Credentials**:
- **Locally**: Run `gcloud auth application-default login`
- **Cloud Run**: Automatically uses the service account attached to the Cloud Run service (no config needed)

No service account key file is required.

---

## Environment Variables

Create a `.env` file in the `source/` directory:

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | e.g., `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | e.g., `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `ADMIN_EMAILS` | Yes | Comma-separated admin emails (auto-promoted on first login) |

The `VITE_` prefix makes these available to the frontend at build time via Vite's `import.meta.env`.

**Production-only** (set via `--set-env-vars` on Cloud Run):

| Variable | Description |
|---|---|
| `GCS_BUCKET` | Google Cloud Storage bucket name for persistent `db.json` |
| `ADMIN_EMAILS` | Same as above, set on Cloud Run service |

---

## Deployment (Google Cloud Run)

### Prerequisites

- A GCP project with **billing enabled** (required even for free tier)
- **Artifact Registry API** enabled
- **Cloud Build API** enabled
- **Cloud Run API** enabled
- A **GCS bucket** for data persistence

### 1. Create a GCS bucket (if you don't have one)

```bash
gcloud storage buckets create gs://YOUR-BUCKET-NAME \
  --project=YOUR-PROJECT-ID \
  --location=europe-west1
```

### 2. Deploy

```bash
cd source

gcloud run deploy cyber-pong-arcade-league \
  --source=. \
  --region=europe-west1 \
  --project=YOUR-PROJECT-ID \
  --allow-unauthenticated \
  --set-env-vars="GCS_BUCKET=YOUR-BUCKET-NAME,ADMIN_EMAILS=your-email@gmail.com" \
  --memory=512Mi --cpu=1 \
  --min-instances=0 --max-instances=3
```

This command:
1. Uploads the source code
2. Builds the Docker image using Cloud Build
3. Pushes to Artifact Registry
4. Creates/updates a Cloud Run service

**Note**: The `.env` file is included in the Docker build context (via `COPY .env* ./` in the Dockerfile) so that Vite can read `VITE_*` variables during `npm run build`.

### 3. Add Cloud Run URL to Firebase

After deployment, copy the service URL and add it to Firebase Authentication > Settings > Authorized domains.

### 4. Free Tier Limits

Cloud Run free tier includes:
- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

With `min-instances=0`, the service scales to zero when idle (no charges).

### 5. Verify the deployment

```bash
# Check running services
gcloud run services list --project=YOUR-PROJECT-ID

# View logs
gcloud run services logs read cyber-pong-arcade-league \
  --region=europe-west1 \
  --project=YOUR-PROJECT-ID
```

### 6. Redeploying

Simply re-run the `gcloud run deploy` command. Cloud Build will rebuild and deploy a new revision.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  React App (Vite build)                                 │ │
│  │  ├─ Firebase Auth SDK (Google Sign-In)                  │ │
│  │  ├─ storageService.ts (API client, attaches JWT)        │ │
│  │  └─ Components (Leaderboard, PlayersHub, Armory, etc.)  │ │
│  └──────────────────────┬──────────────────────────────────┘ │
└─────────────────────────┼───────────────────────────────────┘
                          │ REST API + Bearer Token
┌─────────────────────────┼───────────────────────────────────┐
│  Express Server (server.js)                                  │
│  ├─ Static file serving (dist/)                              │
│  ├─ authMiddleware (Firebase Admin SDK, verifies JWT)        │
│  ├─ adminMiddleware (checks UID against admins list)         │
│  ├─ ELO calculation engine                                   │
│  └─ Data persistence ──┬─── Local: db.json (dev)            │
│                        └─── Cloud: GCS bucket (prod)         │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

1. User signs in with Google via Firebase client SDK
2. Client obtains a Firebase ID token (JWT)
3. Every API request includes `Authorization: Bearer <token>`
4. Server verifies the token with Firebase Admin SDK
5. Server checks admin status against the `admins[]` array in `db.json`
6. Response is sent back to the client

### Data Persistence

- **Local development**: Data is stored in `source/db.json` on the filesystem
- **Production (Cloud Run)**: Data is stored in a GCS bucket as `db.json`
- The server detects `GCS_BUCKET` env var to determine the mode

---

## API Reference

All endpoints require authentication (`Authorization: Bearer <firebase-id-token>`) unless noted.

### State

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/state` | User | Get all players, matches, history, rackets |

### User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | User | Get current user profile and linked player |
| POST | `/api/me/setup` | User | First-time profile creation (name, avatar, bio) |
| PUT | `/api/me/profile` | User | Update own profile (name, avatar, bio) |

### Players

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/players` | User | Create a new player |
| PUT | `/api/players/:id` | User | Update player fields (name, racket, etc.) |
| DELETE | `/api/players/:id` | Admin | Delete a player |

### Rackets

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/rackets` | User | Create a racket (validates stat budget) |
| PUT | `/api/rackets/:id` | User | Update a racket (validates stat budget) |
| DELETE | `/api/rackets/:id` | Admin | Delete a racket |

### Matches

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/matches` | User | Log a match (triggers ELO calculation) |
| DELETE | `/api/matches/:id` | Admin | Delete and reverse ELO changes |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | List all users with admin status |
| POST | `/api/admin/promote` | Admin | Promote a user to admin |
| POST | `/api/admin/demote` | Admin | Demote an admin (cannot demote self) |

### Data Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/export` | User | Export all league data as JSON |
| POST | `/api/import` | Admin | Import league data (overwrites) |
| POST | `/api/reset` | Admin | Reset data (modes: `season`, `wipe`, `fresh`) |

---

## ELO System

### Parameters

| Parameter | Value |
|---|---|
| Starting ELO | 1200 |
| K-Factor | 32 |
| Separate ratings | Singles + Doubles |

### Formulas

**Expected score:**

```
E = 1 / (1 + 10^((opponent_elo - your_elo) / 400))
```

**New rating:**

```
new_elo = old_elo + K * (result - expected)
```

Where `result` = 1 for win, 0 for loss.

### Doubles

In doubles matches, the **average ELO** of each team is used for the expected score calculation. Both teammates gain/lose the same amount.

### Rank Tiers

| Rank | ELO Range | Color |
|---|---|---|
| NOOB | 0 -- 1199 | Gray |
| PADDLER | 1200 -- 1399 | Blue |
| HUSTLER | 1400 -- 1599 | Purple |
| MASTER | 1600 -- 1999 | Pink |
| GOD OF SPIN | 2000+ | Yellow |

### Match Deletion

Deleting a match reverses the ELO changes for all involved players. Streaks are reset to 0 (exact streak reconstruction is not possible).

---

## Racket System

### Stat Budget

Each racket has **30 points** to distribute across 6 stats. Individual stats range from 0 to 20.

### Stats

| Stat | Description |
|---|---|
| Speed | Swing speed and recovery. Fast exchanges and serves. |
| Spin | Ability to put spin on the ball. Tricky curves and deceptive returns. |
| Power | Raw hitting force. Hard-to-return smashes. |
| Control | Precision and placement accuracy. Consistent shot placement. |
| Defense | Blocking, returning, and rally survival. Wall-like resilience. |
| Chaos | Unpredictability factor. Wild, unorthodox shots. |

**Note**: Racket stats are cosmetic and for fun. They do not affect ELO calculations.

### Presets

| Preset | Specialty | Top Stats |
|---|---|---|
| Speed Demon | Speed build | Speed 18, Spin 5 |
| The Wall | Defense build | Defense 18, Control 5 |
| Spin Doctor | Spin build | Spin 18, Speed 5 |
| Power Hitter | Power build | Power 18, Control 3 |
| All-Rounder | Balanced | All stats at 5 |
| Chaos Agent | Chaos build | Chaos 15, all others 3 |

### Editing Rackets

Any authenticated user can edit any racket's name, icon, color, and stats. The stat budget is re-validated on every update.

---

## Authentication & Authorization

### Roles

| Role | Can Do |
|---|---|
| **User** | Log matches, create/edit rackets, manage own profile, view all data |
| **Admin** | All user actions + delete players/matches/rackets, reset data, promote/demote users, rename any player |

### Admin Designation

Admins are designated in two ways:

1. **Environment variable**: Set `ADMIN_EMAILS=email@example.com` -- users with matching emails are auto-promoted on their first API call
2. **Manual promotion**: An existing admin can promote other users via Settings > User Management

### Token Flow

1. Client signs in with Google via Firebase Auth SDK (`signInWithPopup`)
2. Client calls `user.getIdToken()` to get a JWT
3. JWT is attached to every API request as `Authorization: Bearer <token>`
4. Server verifies the JWT using Firebase Admin SDK (`admin.auth().verifyIdToken()`)
5. Server extracts `uid`, `email`, `name`, `picture` from the decoded token

---

## Data Model

### Player

```typescript
interface Player {
  id: string;
  name: string;
  avatar: string;          // URL or base64 data URI
  bio?: string;            // Max 150 characters
  eloSingles: number;
  eloDoubles: number;
  wins: number;
  losses: number;
  streak: number;          // Positive = win streak, negative = loss streak
  joinedAt: string;        // ISO timestamp
  mainRacketId?: string;   // Equipped racket ID
  uid?: string;            // Firebase UID (links to auth account)
}
```

### Match

```typescript
interface Match {
  id: string;
  type: 'singles' | 'doubles';
  winners: string[];       // Player IDs
  losers: string[];        // Player IDs
  scoreWinner: number;
  scoreLoser: number;
  timestamp: string;       // ISO timestamp
  eloChange: number;       // Points transferred
}
```

### Racket

```typescript
interface Racket {
  id: string;
  name: string;
  icon: string;            // Lucide icon name (e.g., 'Zap', 'Shield')
  color: string;           // Hex color (e.g., '#00f3ff')
  stats: RacketStats;      // { speed, spin, power, control, defense, chaos }
  createdBy?: string;      // Creator's UID
}
```

### Database Shape (`db.json`)

```json
{
  "players": [],
  "matches": [],
  "history": [],
  "rackets": [],
  "backups": [],
  "admins": []
}
```

---

## Achievements

Achievements are evaluated client-side based on player data and match history.

| Achievement | Condition | Icon |
|---|---|---|
| First Blood | Play 1+ match | Swords |
| On Fire | 5+ win streak | Flame |
| Unstoppable | 10+ win streak | Zap |
| Veteran | 50+ matches played | Award |
| Century | 100+ matches played | Target |
| Elo Climber | Reach 1400 Singles ELO | TrendingUp |
| Master | Reach 1600 Singles ELO | Crown |
| Comeback Kid | Win after 3+ consecutive losses | RotateCcw |

---

## Development Guide

### Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `concurrently "vite" "node server.js"` | Start dev server + backend |
| `npm run build` | `vite build` | Build frontend to `dist/` |
| `npm start` | `node server.js` | Start production server |

### Dev Server Architecture

In development, two servers run simultaneously:
- **Vite** on port 5173 (frontend HMR)
- **Express** on port 8080 (API backend)

Vite proxies `/api/*` to `localhost:8080` (configured in `vite.config.ts`).

### Adding a New Component

1. Create `source/components/YourComponent.tsx`
2. Import and render it in the appropriate tab in `App.tsx`
3. If it needs API data, pass props down from App's state

### Adding a New API Endpoint

1. Add the route handler in `server.js`
2. Use `authMiddleware` for authenticated routes
3. Add `adminMiddleware` after `authMiddleware` for admin-only routes
4. Add the client-side function in `services/storageService.ts`
5. Call it from App.tsx or the relevant component

### Adding a New Achievement

1. Add the definition to the `ACHIEVEMENTS` array in `achievements.ts`
2. Add the evaluation logic in `getPlayerAchievements()`

### Styling

- Tailwind CSS is loaded via CDN in `index.html` (with custom config)
- Custom colors: `cyber-bg`, `cyber-cyan`, `cyber-pink`, `cyber-purple`, `cyber-yellow`
- Fonts: `font-sans` (Inter), `font-mono` (JetBrains Mono), `font-display` (Orbitron)
- Glass morphism: Use the `glass-panel` class
- Animations: `animate-fadeIn`, `animate-slideUp`, `animate-pulse`

### Docker Build

The Dockerfile uses a multi-stage build:

1. **Build stage** (node:22): Installs all deps, runs `vite build`
2. **Production stage** (node:22-slim): Installs only production deps, copies `server.js` + `dist/`

The `.env` file is copied into the build stage so Vite can read `VITE_*` variables.

---

## Troubleshooting

### "Permission denied while accessing Artifact Registry"

Enable billing on your GCP project. Even free-tier services require a billing account.

### "Firebase Auth: popup blocked"

Ensure `localhost` (or your domain) is in Firebase Auth > Settings > Authorized domains.

### "401 Authentication required" on all API calls

1. Check that Firebase config values in `.env` are correct
2. Ensure you're signed in (check browser console for auth state)
3. For local dev, ensure `gcloud auth application-default login` has been run

### Data not persisting on Cloud Run

- Check that `GCS_BUCKET` env var is set on the Cloud Run service
- Verify the Cloud Run service account has `Storage Object Admin` role on the bucket

### Cold starts are slow

Cloud Run with `min-instances=0` has cold starts (~2-5s). Set `min-instances=1` if this is unacceptable (but it will incur charges outside free tier).

### Build fails in Cloud Build

- Check `.gcloudignore` isn't excluding necessary files
- Ensure `package-lock.json` is committed (Docker uses `npm install`, not `npm ci`)
- Check Cloud Build logs: `gcloud builds list --project=YOUR-PROJECT-ID`

---

## License

This project is for personal/educational use. Not affiliated with any commercial entity.
