# Cyber-Pong Arcade League

A cyberpunk-themed ping pong league tracker with ELO rankings, player profiles, custom racket forging, matchmaking, tournaments, seasons, challenges, and Google Sign-In authentication. Built with React + Express, deployed on Google Cloud Run (free tier).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Firebase Setup](#firebase-setup)
- [Supabase Setup](#supabase-setup)
- [Environment Variables](#environment-variables)
- [Deployment (Google Cloud Run)](#deployment-google-cloud-run)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [ELO System](#elo-system)
- [Racket System](#racket-system)
- [Seasons System](#seasons-system)
- [Tournaments](#tournaments)
- [Challenges](#challenges)
- [Pending Match Confirmation](#pending-match-confirmation)
- [Authentication & Authorization](#authentication--authorization)
- [Data Model](#data-model)
- [Database Migration](#database-migration)
- [Achievements](#achievements)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Features

### Core Features
- **ELO-based Rankings** -- Separate singles and doubles ELO ratings with K-factor 32
- **Google Sign-In** -- Firebase Authentication with role-based access (admin / regular)
- **Player Profiles** -- Custom username, avatar (upload or preset), bio, achievements, performance charts
- **Unified Players Hub** -- Browse all players in a grid with quick stats; click to view full profile or compare two players head-to-head
- **Clickable Leaderboard** -- Click any player in the rankings to jump to their profile
- **Match Logging** -- Log 1v1 or 2v2 matches with score validation and undo support
- **Smart Matchmaking** -- Suggests balanced pairings based on ELO proximity (singles and doubles)
- **Racket Armory** -- Forge custom rackets with 6 stats (Speed, Spin, Power, Control, Defense, Chaos), icons, and colors. Edit existing rackets. 30-point stat budget system.
- **No-Racket Prompt** -- Users without a racket see a prompt to forge or equip one

### Competition Features
- **Tournaments** -- Create and run single-elimination or round-robin tournaments with automatic bracket generation
- **Seasons** -- Multi-season support with start/end dates, standings archiving, and champion tracking
- **Challenges** -- Players can challenge each other with ELO wagers (up to 50 points). Bonus points transfer when challenge is completed.
- **Weekly Challenges** -- Dynamic challenges that reset periodically (win streaks, matches played, ELO gain targets)
- **Player of the Week** -- Automatically highlights top performing player based on recent activity
- **Hall of Fame** -- Historical records and all-time achievements display

### Match Management
- **Pending Match Confirmation** -- Matches logged by one player require confirmation from opponents before ELO changes apply. Auto-confirms after 24 hours.
- **Match Disputes** -- Players can dispute incorrect match entries for admin review
- **Match Editing** -- Admins can edit match details with automatic ELO recalculation
- **Match Reactions** -- Add emoji reactions to matches for social engagement
- **Undo Support** -- Undo recently logged matches with full ELO reversal

### Admin Features
- **Admin Controls** -- Season reset, factory reset, data export/import, player deletion, user promotion/demotion, rename any player
- **User Management** -- Promote/demote users to admin, view all registered users
- **Force Confirm Matches** -- Admins can force-confirm disputed or pending matches
- **Tournament Management** -- Create and delete tournaments, monitor progress

### Social & Engagement
- **Achievements** -- First Blood, On Fire, Unstoppable, Veteran, Century, Elo Climber, Master, Comeback Kid
- **Account Claiming** -- Link Google account to existing player profiles
- **Advanced Stats** -- Deep statistics including head-to-head records, rivalry tracking, form analysis
- **Responsive UI** -- Fully responsive cyberpunk design with glass morphism, neon effects, and mobile-first navigation

### Technical Features
- **Free Tier Deployment** -- Runs entirely on Google Cloud Run free tier
- **Offline Detection** -- Visual indicator when connection to server is lost
- **Toast Notifications** -- Success/error feedback with action buttons (e.g., Undo)
- **Auto-refresh** -- Data automatically refreshes every 5 seconds

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS (CDN), Recharts, Lucide Icons |
| Build Tool | Vite 5 |
| Backend | Express 4, Node 22 |
| Auth | Firebase Authentication (Google Sign-In) |
| Auth (Server) | Firebase Admin SDK (JWT verification) |
| Database | **Supabase PostgreSQL** (new) or Local `db.json` / GCS (legacy) |
| Deployment | Google Cloud Run via Dockerfile |
| Container | Multi-stage Docker build (Node 22 + Node 22-slim) |

---

## Project Structure

```
test-pong/
├── README.md                   # This file
├── source/                     # All application code
│   ├── README.md              # AI Studio proxy info (legacy)
│   ├── USER_GUIDE.md          # Deployment guide
│   ├── Dockerfile             # Multi-stage Docker build
│   ├── package.json           # Dependencies and scripts
│   ├── server.js              # Express backend (API + static serving)
│   ├── vite.config.ts         # Vite config with API proxy
│   ├── tsconfig.json          # TypeScript config
│   ├── index.html             # HTML entry + Tailwind config + CSS
│   ├── index.tsx              # React entry point
│   ├── App.tsx                # Root component, routing, state management
│   ├── types.ts               # TypeScript interfaces
│   ├── constants.ts           # Ranks, avatars, racket presets, stat budget
│   ├── achievements.ts        # Achievement definitions and evaluation
│   ├── firebaseConfig.ts      # Firebase web SDK initialization
│   ├── .env                   # Environment variables (not committed)
│   ├── .env.example           # Template for environment variables
│   ├── .gcloudignore          # Files to exclude from Cloud Build
│   ├── db.json                # Local database (dev only, gitignored)
│   ├── lib/
│   │   └── supabase.ts        # Supabase client configuration
│   ├── components/
│   │   ├── Layout.tsx         # Nav bar, tabs, background effects
│   │   ├── Leaderboard.tsx    # Rankings table with ELO info panel
│   │   ├── PlayersHub.tsx     # Unified player grid + profile + compare
│   │   ├── PlayerProfile.tsx  # Detailed player stats, chart, achievements
│   │   ├── MatchLogger.tsx    # Match submission form
│   │   ├── MatchMaker.tsx     # Smart matchmaking suggestions
│   │   ├── MatchReactions.tsx # Emoji reactions on matches
│   │   ├── RacketManager.tsx  # Racket creation, editing, info guide
│   │   ├── CreatePlayerForm.tsx # New player modal
│   │   ├── LoginScreen.tsx    # Google Sign-In screen
│   │   ├── ProfileSetup.tsx   # First-login profile creation
│   │   ├── RecentMatches.tsx  # Match history feed
│   │   ├── PendingMatches.tsx # Match confirmation UI
│   │   ├── RankBadge.tsx      # Rank tier badge component
│   │   ├── Settings.tsx       # Admin tools, profile editing
│   │   ├── StatsDashboard.tsx # (Legacy, replaced by PlayersHub)
│   │   ├── AdvancedStats.tsx  # Deep statistics and analysis
│   │   ├── ChallengeBoard.tsx # Player challenges interface
│   │   ├── HallOfFame.tsx     # Historical records display
│   │   ├── PlayerOfTheWeek.tsx # Weekly highlight component
│   │   ├── WeeklyChallenges.tsx # Dynamic challenges UI
│   │   ├── TournamentBracket.tsx # Tournament management
│   │   ├── SeasonManager.tsx  # Season administration
│   │   └── StatsDashboard.tsx # (Legacy)
│   ├── services/
│   │   ├── authService.ts     # Firebase auth operations
│   │   ├── storageService.ts  # API client (all REST calls)
│   │   └── eloService.ts      # Client-side ELO utilities
│   └── utils/
│       ├── imageUtils.ts      # Client-side image resizing for avatars
│       ├── statsUtils.ts      # Statistics calculations
│       ├── rivalryUtils.ts    # Head-to-head analysis
│       ├── predictionUtils.ts # Win probability calculations
│       └── offlineQueue.ts    # Offline request queueing
├── scripts/
│   └── migrate-to-supabase.ts # Database migration script
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Supabase database schema
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

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up/login
2. Click "New Project"
3. Choose your organization, give it a name, and select a region close to your users
4. Wait for the project to be created (this takes a few minutes)

### 2. Get Your API Credentials

1. Go to **Project Settings** > **API**
2. Copy the following values:
   - **URL**: Your project URL (e.g., `https://xxx.supabase.co`)
   - **service_role key**: The secret key (NOT the anon/public key)

### 3. Run the Database Schema

1. Go to the **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL

Alternatively, use psql:
```bash
psql -h db.xxx.supabase.co -p 5432 -d postgres -U postgres -f supabase/migrations/001_initial_schema.sql
```

### 4. Configure Environment Variables

Add to your `.env` file:
```
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Free Tier Limits

Supabase free tier includes:
- **500MB** database storage
- **50,000** monthly active users
- **2GB** bandwidth
- **500MB** file storage (if using Supabase Storage)

For a ping pong league with 50-250 users, this is more than sufficient.

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

**Database Configuration** (choose one):

| Variable | Required | Description |
|---|---|---|
| `USE_SUPABASE` | No | Set to `true` to use Supabase PostgreSQL (recommended for production) |
| `SUPABASE_URL` | If USE_SUPABASE=true | Your Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | If USE_SUPABASE=true | Supabase service role key (NOT the anon key) |
| `GCS_BUCKET` | No | Google Cloud Storage bucket for legacy JSON mode or file storage |

**Production-only** (set via `--set-env-vars` on Cloud Run):

| Variable | Description |
|---|---|
| `GCS_BUCKET` | Google Cloud Storage bucket name for persistent `db.json` (legacy mode) |
| `ADMIN_EMAILS` | Same as above, set on Cloud Run service |
| `USE_SUPABASE` | Set to `true` to enable Supabase mode |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

---

## Deployment (Google Cloud Run)

### Prerequisites

- A GCP project with **billing enabled** (required even for free tier)
- **Artifact Registry API** enabled
- **Cloud Build API** enabled
- **Cloud Run API** enabled
- A **GCS bucket** for data persistence

### 1. Choose Your Database

#### Option A: Supabase PostgreSQL (Recommended for production)

The app now supports Supabase PostgreSQL as the primary database. This provides better reliability, concurrent access, and easier backups compared to JSON file storage.

**Free tier limits (perfect for 50-250 users):**
- 500MB database storage
- 50,000 monthly active users
- 2GB egress
- Unlimited API requests

**Setup:**

1. Create a free Supabase project at https://supabase.com
2. Go to Project Settings > API and copy your `URL` and `service_role` key
3. Run the database migration:
   ```bash
   cd supabase/migrations
   psql -h YOUR_PROJECT_URL -p 5432 -d postgres -U postgres -f 001_initial_schema.sql
   ```
   Or use the Supabase SQL Editor to run the contents of `001_initial_schema.sql`
4. Migrate your existing data (optional):
   ```bash
   cd source
   export SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_SERVICE_KEY=your-service-key
   npx tsx ../scripts/migrate-to-supabase.ts
   ```

#### Option B: Google Cloud Storage (Legacy JSON mode)

Create a GCS bucket for JSON file persistence:

```bash
gcloud storage buckets create gs://YOUR-BUCKET-NAME \
  --project=YOUR-PROJECT-ID \
  --location=europe-west1
```

### 2. Deploy

```bash
cd source

# For Supabase (recommended):
gcloud run deploy cyber-pong-arcade-league \
  --source=. \
  --region=europe-west1 \
  --project=YOUR-PROJECT-ID \
  --allow-unauthenticated \
  --set-env-vars="USE_SUPABASE=true,SUPABASE_URL=https://your-project.supabase.co,SUPABASE_SERVICE_KEY=your-key,ADMIN_EMAILS=your-email@gmail.com" \
  --memory=512Mi --cpu=1 \
  --min-instances=0 --max-instances=3

# For GCS/JSON legacy mode:
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

### 3. Grant Permissions

The Cloud Run service needs permission to read/write to your bucket.

1. Get the **Service Account** email from the deploy output (or find it in Cloud Console > Cloud Run > Details). It looks like: `[number]-compute@developer.gserviceaccount.com`.
2. Grant the **Storage Object Admin** role:

```bash
gcloud storage buckets add-iam-policy-binding gs://YOUR-BUCKET-NAME \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.objectAdmin"
```

### 4. Add Cloud Run URL to Firebase

After deployment, copy the service URL and add it to Firebase Authentication > Settings > Authorized domains.

### 5. Free Tier Limits

Cloud Run free tier includes:
- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

With `min-instances=0`, the service scales to zero when idle (no charges).

### 6. Verify the deployment

```bash
# Check running services
gcloud run services list --project=YOUR-PROJECT-ID

# View logs
gcloud run services logs read cyber-pong-arcade-league \
  --region=europe-west1 \
  --project=YOUR-PROJECT-ID
```

### 7. Redeploying

Simply re-run the `gcloud run deploy` command. Cloud Build will rebuild and deploy a new revision.

### 8. Backups

Since your database is just a JSON file in a storage bucket, you can download a backup anytime:

```bash
gcloud storage cp gs://YOUR-BUCKET-NAME/db.json ./backup.json
```

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
│  ├─ Tournament bracket generation                            │
│  ├─ Season management                                        │
│  ├─ Challenge/wager system                                   │
│  └─ Data persistence ──┬─── Supabase PostgreSQL (recommended)│
│                        ├─── Cloud: GCS bucket (legacy)       │
│                        └─── Local: db.json (dev/legacy)      │
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
| GET | `/api/state` | User | Get all players, matches, history, rackets, pending matches, seasons, challenges, tournaments |

### User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | User | Get current user profile and linked player |
| POST | `/api/me/setup` | User | First-time profile creation (name, avatar, bio) |
| PUT | `/api/me/profile` | User | Update own profile (name, avatar, bio) |
| POST | `/api/me/claim` | User | Claim an unlinked player account |

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
| PUT | `/api/matches/:id` | Admin | Edit a match (recalculates ELO) |
| DELETE | `/api/matches/:id` | Admin | Delete and reverse ELO changes |

### Pending Match Confirmation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/pending-matches` | User | Create a pending match |
| PUT | `/api/pending-matches/:id/confirm` | User | Confirm a pending match |
| PUT | `/api/pending-matches/:id/dispute` | User | Dispute a pending match |
| PUT | `/api/pending-matches/:id/force-confirm` | Admin | Force confirm a pending/disputed match |
| DELETE | `/api/pending-matches/:id` | Admin | Reject and delete a pending match |

### Seasons

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/seasons/start` | Admin | Start a new season |
| POST | `/api/seasons/end` | Admin | End the active season |

### Challenges

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/challenges` | User | Send a challenge to another player |
| PUT | `/api/challenges/:id/respond` | User | Accept or decline a challenge |
| PUT | `/api/challenges/:id/complete` | User | Complete a challenge (link to match) |

### Tournaments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/tournaments` | User | Create a new tournament |
| PUT | `/api/tournaments/:id/results` | User | Submit tournament match result |
| DELETE | `/api/tournaments/:id` | Admin | Delete a tournament |

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

## Seasons System

The seasons system allows you to organize play into distinct time periods with tracked standings.

### Season Lifecycle

1. **Start Season** -- Admin creates a new season with a name. The season is marked as "active".
2. **Play Matches** -- All matches during the season count toward that season's stats.
3. **End Season** -- Admin ends the active season:
   - Final standings are calculated and archived
   - A champion is determined (highest ELO)
   - Total match count is recorded
   - Season is marked as "completed"

### Season Data

Each season tracks:
- Season name and number
- Start and end dates
- Final standings (rank, ELO, wins, losses for each player)
- Champion (player with highest ELO at season end)
- Total match count

### Historical Access

Completed seasons are viewable in the Season Manager, allowing players to see:
- Who won previous seasons
- Final rankings
- Historical performance

---

## Tournaments

Create structured competitions with automatic bracket generation.

### Tournament Formats

1. **Single Elimination** -- Players compete in bracket format. Losers are eliminated. Winner advances.
2. **Round Robin** -- Each player plays every other player. Player with most wins is champion.

### Tournament Lifecycle

1. **Creation** -- Admin creates tournament with:
   - Name
   - Format (single_elimination or round_robin)
   - Game type (singles or doubles)
   - Player list

2. **Registration** -- Tournament starts in "registration" status

3. **In Progress** -- Players submit results for their matchups
   - Winners report scores
   - System advances winners in single elimination
   - System tracks wins in round robin

4. **Completed** -- When all matchups have results:
   - Winner is determined
   - Tournament marked complete

### Bracket Generation

- **Single Elimination**: Byes are automatically assigned if player count isn't a power of 2
- **Round Robin**: Generates all unique pairings

---

## Challenges

The challenges system allows players to compete head-to-head with ELO wagers.

### How Challenges Work

1. **Send Challenge** -- A player challenges another with:
   - Optional message
   - Wager amount (0-50 ELO points)

2. **Respond** -- Challenged player can:
   - Accept (challenge becomes active)
   - Decline (challenge expires)

3. **Play Match** -- When the challenged match is logged:
   - Winner receives bonus ELO equal to the wager
   - Loser loses the wagered amount (in addition to normal ELO change)
   - Challenge marked as completed

### Challenge States

- **pending** -- Awaiting response from challenged player
- **accepted** -- Challenge accepted, awaiting match
- **declined** -- Challenge was declined
- **completed** -- Match was played and wager applied
- **expired** -- Challenge timed out (7 days)

---

## Pending Match Confirmation

To prevent incorrect match entries from affecting ELO, matches require confirmation.

### How It Works

1. **Log Match** -- A player logs a match result
2. **Pending Status** -- Match enters "pending" state
   - ELO is NOT yet applied
   - Involved players see it in their Pending Matches section
   - 24-hour countdown begins

3. **Confirmation** -- Other involved players must confirm:
   - Click "Confirm" to approve the result
   - Click "Dispute" if the result is incorrect

4. **Auto-Confirm** -- If all players confirm OR 24 hours pass:
   - ELO is applied
   - Match moves to confirmed history

5. **Dispute Resolution** -- If disputed:
   - Admin reviews and can force-confirm or reject

### Confirmation States

- **pending** -- Awaiting confirmations
- **confirmed** -- All confirmed, ELO applied
- **disputed** -- Under admin review

---

## Authentication & Authorization

### Roles

| Role | Can Do |
|---|---|
| **User** | Log matches, create/edit rackets, manage own profile, view all data, confirm/dispute matches, send/respond to challenges, join tournaments |
| **Admin** | All user actions + delete players/matches/rackets, reset data, promote/demote users, rename any player, force-confirm matches, manage seasons, create/delete tournaments |

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

### Account Claiming

If a player profile exists without a linked Google account (legacy or created by admin), users can claim it during profile setup. This allows:
- Migrating from non-authenticated to authenticated system
- Admins creating profiles for players who haven't signed up yet

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
  loggedBy?: string;       // Firebase UID of the user who logged the match
}
```

### PendingMatch

```typescript
interface PendingMatch {
  id: string;
  type: 'singles' | 'doubles';
  winners: string[];
  losers: string[];
  scoreWinner: number;
  scoreLoser: number;
  loggedBy: string;
  status: 'pending' | 'confirmed' | 'disputed';
  confirmations: string[]; // UIDs who confirmed
  createdAt: string;
  expiresAt: string;       // Auto-confirm deadline (24h)
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

### Season

```typescript
interface Season {
  id: string;
  name: string;
  number: number;
  status: 'active' | 'completed';
  startedAt: string;
  endedAt?: string;
  finalStandings: SeasonStanding[];
  matchCount: number;
  championId?: string;
}
```

### Challenge

```typescript
interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  wager: number;           // Bonus ELO points at stake (0-50)
  matchId?: string;        // Linked match when completed
  createdAt: string;
  message?: string;
}
```

### Tournament

```typescript
interface Tournament {
  id: string;
  name: string;
  format: 'single_elimination' | 'round_robin';
  status: 'registration' | 'in_progress' | 'completed';
  gameType: 'singles' | 'doubles';
  playerIds: string[];
  rounds: TournamentRound[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
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
  "admins": [],
  "pendingMatches": [],
  "seasons": [],
  "challenges": [],
  "tournaments": [],
  "reactions": []
}
```

---

## Database Migration

### Migrating from JSON to Supabase

If you have existing data in a JSON file (local or GCS) and want to migrate to Supabase:

1. **Set up your Supabase project** (see Deployment section)

2. **Run the migration script**:
   ```bash
   cd source
   
   # Set environment variables
   export SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_SERVICE_KEY=your-service-role-key
   
   # Optional: specify a different db.json path
   export DB_FILE_PATH=/path/to/your/db.json
   
   # Run the migration
   npx tsx ../scripts/migrate-to-supabase.ts
   ```

3. **Verify the migration**:
   - Check the Supabase Table Editor to see imported data
   - Run the app locally with `USE_SUPABASE=true` to test

4. **Switch over**:
   - Update your Cloud Run deployment with Supabase env vars
   - The app will automatically use Supabase when `USE_SUPABASE=true`

### Migration Script Features

The migration script (`scripts/migrate-to-supabase.ts`):
- Clears existing Supabase data before migration
- Transforms JSON structure to relational format (e.g., match winners/losers into junction table)
- Preserves all data: players, matches, history, rackets, admins, pending matches, seasons, challenges, tournaments, reactions
- Reports errors and summary statistics
- Idempotent - can be run multiple times safely

### Rolling Back

To revert to JSON file mode:
1. Remove or set `USE_SUPABASE=false`
2. The app will fall back to GCS_BUCKET or local filesystem
3. Your JSON file data remains unchanged

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
| `npm run preview` | `vite preview` | Preview production build |
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

### Pending matches not confirming

- Pending matches auto-confirm after 24 hours
- Ensure server is running (the check happens on `/api/state` requests)
- Check that `createdAt` and `expiresAt` are valid ISO timestamps

---

## License

This project is for personal/educational use. Not affiliated with any commercial entity.
