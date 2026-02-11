# Architecture Documentation

## System Overview

Cyber-Pong Arcade League is a full-stack web application for managing ping pong leagues with ELO-based rankings, tournaments, seasons, and social features. The architecture follows a client-server model with a React SPA frontend and Express REST API backend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Browser (React SPA)                                      │   │
│  │  ├─ UI Components (Presentation)                          │   │
│  │  ├─ Context Providers (State Management)                  │   │
│  │  ├─ Services (Business Logic)                             │   │
│  │  └─ Utils (Helper Functions)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / REST API
                              │ JSON Payloads
                              │ JWT Authentication
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Server Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express Server (Node.js)                                │   │
│  │  ├─ Middleware (Auth, CORS, Logging)                     │   │
│  │  ├─ Routes (API Endpoints)                               │   │
│  │  ├─ Services (Business Logic)                            │   │
│  │  └─ Database Layer (Abstraction)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Database Protocol
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                           │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │  Supabase        │  Google Cloud    │  Local           │    │
│  │  PostgreSQL      │  Storage (JSON)  │  Filesystem      │    │
│  │  (Production)    │  (Legacy)        │  (Development)   │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────────┬──────────────────┬──────────────────┐    │
│  │  Firebase Auth   │  Google Cloud    │  Artifact        │    │
│  │  (Identity)      │  Run (Hosting)   │  Registry        │    │
│  └──────────────────┴──────────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Architecture

```
React Application
├── Entry Point (index.tsx)
│   └── Renders App component
│
├── Root Component (App.tsx)
│   ├── Context Providers
│   │   ├── ToastProvider (notifications)
│   │   ├── AuthProvider (authentication state)
│   │   └── LeagueProvider (application state)
│   │
│   ├── Layout Component
│   │   ├── Navigation
│   │   ├── Tab Routing
│   │   └── Background Effects
│   │
│   └── Page Components
│       ├── Leaderboard
│       ├── Match Logger
│       ├── Players Hub
│       ├── Racket Manager
│       ├── Tournaments
│       ├── Seasons
│       └── Settings
│
├── Context Layer
│   ├── AuthContext
│   │   ├── Firebase authentication
│   │   ├── User profile management
│   │   └── Admin status
│   │
│   ├── LeagueContext
│   │   ├── Global state (players, matches, etc.)
│   │   ├── Data fetching (polling)
│   │   └── State updates
│   │
│   └── ToastContext
│       ├── Notification queue
│       └── Toast display logic
│
├── Services Layer
│   ├── storageService.ts
│   │   └── REST API client (all endpoints)
│   │
│   ├── authService.ts
│   │   └── Firebase auth operations
│   │
│   └── eloService.ts
│       └── ELO calculations
│
└── Utils Layer
    ├── imageUtils.ts (image processing)
    ├── statsUtils.ts (statistics)
    ├── rivalryUtils.ts (head-to-head)
    └── predictionUtils.ts (win probability)
```

### Backend Architecture

```
Express Server
├── Entry Point (server/index.js)
│   ├── Initialize Firebase Admin
│   ├── Configure middleware
│   ├── Mount routes
│   └── Start HTTP server
│
├── Middleware Layer
│   ├── CORS (cross-origin requests)
│   ├── JSON body parser
│   ├── Request logging
│   ├── authMiddleware (JWT verification)
│   └── adminMiddleware (admin check)
│
├── Routes Layer (Modular)
│   ├── state.js (GET /api/state)
│   ├── me.js (user profile)
│   ├── players.js (player CRUD)
│   ├── matches.js (match logging)
│   ├── rackets.js (racket management)
│   ├── pending-matches.js (confirmations)
│   ├── seasons.js (season management)
│   ├── challenges.js (player challenges)
│   ├── tournaments.js (tournament brackets)
│   ├── leagues.js (league management)
│   ├── admin.js (admin operations)
│   └── export-import.js (data management)
│
├── Services Layer
│   └── elo.js
│       ├── calculateEloChange()
│       ├── updatePlayerElo()
│       └── reverseEloChange()
│
└── Database Layer
    ├── persistence.js
    │   ├── loadDB() (read from storage)
    │   └── saveDB() (write to storage)
    │
    ├── operations.js
    │   ├── CRUD operations
    │   └── Complex queries
    │
    └── mappers.js
        └── Data transformation
```

## Data Flow

### Authentication Flow

```
1. User clicks "Sign in with Google"
   │
   ├─> Firebase SDK opens popup
   │
2. User authenticates with Google
   │
   ├─> Firebase returns user object + JWT
   │
3. Client stores JWT in memory
   │
   ├─> Every API request includes JWT in Authorization header
   │
4. Server verifies JWT with Firebase Admin SDK
   │
   ├─> Extracts user info (uid, email, name)
   │
5. Server checks admin status
   │
   └─> Returns user profile + permissions
```

### Match Logging Flow

```
1. User submits match form
   │
   ├─> MatchLogger component validates input
   │
2. Component calls handler
   │
   ├─> handleMatchSubmit() in useLeagueHandlers
   │
3. Handler calls API
   │
   ├─> POST /api/pending-matches
   │
4. Server creates pending match
   │
   ├─> Status: 'pending'
   ├─> Expires in 24 hours
   │
5. Opponents confirm match
   │
   ├─> PUT /api/pending-matches/:id/confirm
   │
6. When all confirm (or 24h passes)
   │
   ├─> Calculate ELO changes
   ├─> Update player stats
   ├─> Create match record
   ├─> Add to ELO history
   │
7. Client refreshes data
   │
   └─> GET /api/state
```

### State Management Flow

```
1. App loads
   │
   ├─> LeagueContext initializes
   │
2. Context fetches initial data
   │
   ├─> GET /api/state
   │
3. Context starts polling (5s interval)
   │
   ├─> Periodic GET /api/state
   │
4. User performs action
   │
   ├─> Component calls handler
   ├─> Handler calls API
   ├─> API updates database
   │
5. Next poll cycle
   │
   ├─> GET /api/state
   ├─> Context updates state
   │
6. Components re-render
   │
   └─> UI reflects new data
```

## Database Architecture

### Supabase Schema (Relational)

```
players (main entity)
  ├─ id (PK)
  ├─ name, avatar, bio
  ├─ elo_singles, elo_doubles
  ├─ wins/losses/streak (singles + doubles)
  ├─ main_racket_id (FK → rackets)
  ├─ uid (Firebase UID)
  └─ league_id (FK → leagues)

matches (confirmed matches)
  ├─ id (PK)
  ├─ type, scores, timestamp
  ├─ elo_change
  ├─ logged_by (Firebase UID)
  ├─ is_friendly
  └─ league_id (FK → leagues)

match_winners (junction table)
  ├─ match_id (FK → matches)
  └─ player_id (FK → players)

match_losers (junction table)
  ├─ match_id (FK → matches)
  └─ player_id (FK → players)

elo_history (time series)
  ├─ id (PK)
  ├─ player_id (FK → players)
  ├─ match_id (FK → matches)
  ├─ new_elo
  ├─ timestamp
  └─ game_type

rackets (custom equipment)
  ├─ id (PK)
  ├─ name, icon, color
  ├─ stats (JSONB)
  └─ created_by (Firebase UID)

pending_matches (awaiting confirmation)
  ├─ id (PK)
  ├─ type, scores
  ├─ logged_by (Firebase UID)
  ├─ status (pending/confirmed/disputed)
  ├─ confirmations (TEXT[])
  ├─ created_at, expires_at
  └─ is_friendly

seasons (competitive periods)
  ├─ id (PK)
  ├─ name, number
  ├─ status (active/completed)
  ├─ started_at, ended_at
  ├─ final_standings (JSONB)
  ├─ match_count
  └─ champion_id (FK → players)

challenges (player vs player)
  ├─ id (PK)
  ├─ challenger_id (FK → players)
  ├─ challenged_id (FK → players)
  ├─ status (pending/accepted/declined/completed/expired)
  ├─ wager (0-50 ELO)
  ├─ match_id (FK → matches)
  └─ created_at, message

tournaments (brackets)
  ├─ id (PK)
  ├─ name, format, status
  ├─ game_type
  ├─ player_ids (UUID[])
  ├─ rounds (JSONB)
  ├─ created_by (Firebase UID)
  ├─ created_at, completed_at
  └─ winner_id (FK → players)

leagues (groups)
  ├─ id (PK)
  ├─ name, description
  ├─ created_by (Firebase UID)
  └─ created_at, updated_at

admins (authorization)
  ├─ uid (PK, Firebase UID)
  ├─ email
  └─ added_at
```

### JSON Schema (Legacy)

```json
{
  "players": [
    {
      "id": "uuid",
      "name": "string",
      "avatar": "string",
      "bio": "string",
      "eloSingles": 1200,
      "eloDoubles": 1200,
      "winsSingles": 0,
      "lossesSingles": 0,
      "streakSingles": 0,
      "winsDoubles": 0,
      "lossesDoubles": 0,
      "streakDoubles": 0,
      "joinedAt": "ISO timestamp",
      "mainRacketId": "uuid",
      "uid": "firebase-uid",
      "leagueId": "uuid"
    }
  ],
  "matches": [
    {
      "id": "uuid",
      "type": "singles|doubles",
      "winners": ["player-id"],
      "losers": ["player-id"],
      "scoreWinner": 21,
      "scoreLoser": 19,
      "timestamp": "ISO timestamp",
      "eloChange": 15,
      "loggedBy": "firebase-uid",
      "isFriendly": false,
      "leagueId": "uuid"
    }
  ],
  "history": [
    {
      "playerId": "uuid",
      "matchId": "uuid",
      "newElo": 1215,
      "timestamp": "ISO timestamp",
      "gameType": "singles|doubles"
    }
  ],
  "rackets": [...],
  "pendingMatches": [...],
  "seasons": [...],
  "challenges": [...],
  "tournaments": [...],
  "leagues": [...],
  "admins": ["firebase-uid"]
}
```

## Security Architecture

### Authentication

```
Firebase Authentication
├── Google OAuth 2.0
│   ├── User signs in with Google account
│   ├── Firebase issues JWT (ID token)
│   └── Token valid for 1 hour
│
├── Token Verification
│   ├── Client includes token in Authorization header
│   ├── Server verifies with Firebase Admin SDK
│   └── Extracts user claims (uid, email, name)
│
└── Session Management
    ├── Client refreshes token automatically
    └── Server validates on every request
```

### Authorization

```
Role-Based Access Control
├── User Role (default)
│   ├── View all data
│   ├── Log matches
│   ├── Create/edit own profile
│   ├── Create/edit rackets
│   ├── Confirm/dispute matches
│   └── Participate in tournaments
│
└── Admin Role
    ├── All user permissions
    ├── Delete players/matches/rackets
    ├── Edit any player
    ├── Force confirm matches
    ├── Manage seasons
    ├── Reset data
    ├── Promote/demote users
    └── Delete tournaments
```

### Data Protection

```
Input Validation
├── Client-side validation (immediate feedback)
├── Server-side validation (security)
└── Database constraints (data integrity)

SQL Injection Protection
├── Parameterized queries (Supabase)
└── No string concatenation in queries

XSS Protection
├── React auto-escapes output
└── No dangerouslySetInnerHTML

CSRF Protection
├── Stateless JWT authentication
└── No cookies used
```

## Deployment Architecture

### Container Architecture

```
Docker Multi-Stage Build
├── Stage 1: Build (node:22)
│   ├── Install all dependencies
│   ├── Copy source code
│   ├── Run Vite build
│   └── Output: dist/ folder
│
└── Stage 2: Production (node:22-slim)
    ├── Install production dependencies only
    ├── Copy dist/ from build stage
    ├── Copy server code
    ├── Expose port 8080
    └── CMD: Start Express server
```

### Cloud Run Architecture

```
Google Cloud Run
├── Container Registry
│   └── Artifact Registry (Docker images)
│
├── Service Configuration
│   ├── Memory: 512Mi
│   ├── CPU: 1 vCPU
│   ├── Min instances: 0 (scale to zero)
│   ├── Max instances: 3
│   └── Concurrency: 80 requests
│
├── Networking
│   ├── HTTPS endpoint (auto-provisioned)
│   ├── Custom domain support
│   └── Cloud CDN (optional)
│
└── Environment
    ├── Environment variables
    ├── Service account (for GCS/Firebase)
    └── Secrets (for sensitive data)
```

### Scaling Behavior

```
Request Flow
├── Cold Start (0 instances)
│   ├── Request arrives
│   ├── Cloud Run starts container (~2-5s)
│   ├── Container initializes
│   └── Request processed
│
├── Warm Instance (1+ instances)
│   ├── Request arrives
│   ├── Routed to existing container
│   └── Request processed immediately
│
└── Scale Up (high load)
    ├── Multiple concurrent requests
    ├── Cloud Run starts additional containers
    ├── Load balanced across instances
    └── Max 3 instances (configurable)
```

## Performance Architecture

### Frontend Optimization

```
Build Optimization
├── Vite (fast builds)
├── Code splitting (lazy loading)
├── Tree shaking (remove unused code)
└── Minification (smaller bundles)

Runtime Optimization
├── React.memo (prevent re-renders)
├── useMemo (cache calculations)
├── useCallback (stable references)
└── Virtual scrolling (large lists)

Asset Optimization
├── Image compression (200x200 avatars)
├── Base64 encoding (small images)
└── CDN delivery (Tailwind CSS)
```

### Backend Optimization

```
Database Optimization
├── Indexes on frequently queried columns
├── Batch operations (bulk updates)
└── Connection pooling (Supabase)

API Optimization
├── Single endpoint for initial load (/api/state)
├── Pagination for large datasets
└── Caching headers (future enhancement)

Server Optimization
├── Async/await (non-blocking I/O)
├── Streaming responses (large exports)
└── Compression (gzip)
```

### Caching Strategy

```
Current (No Caching)
├── Client polls every 5 seconds
└── Server queries database on every request

Future Enhancement
├── Redis cache layer
│   ├── Cache leaderboard (30s TTL)
│   ├── Cache player profiles (60s TTL)
│   └── Invalidate on mutations
│
└── Client-side cache
    ├── Service Worker (offline support)
    └── IndexedDB (local storage)
```

## Monitoring Architecture

### Logging

```
Application Logs
├── Server logs (console.log)
│   ├── Request logging
│   ├── Error logging
│   └── Business logic events
│
└── Cloud Run logs
    ├── Container stdout/stderr
    ├── Request logs (automatic)
    └── Error logs (automatic)
```

### Metrics

```
Cloud Run Metrics (Automatic)
├── Request count
├── Request latency
├── Error rate
├── Container instances
├── CPU utilization
└── Memory utilization

Application Metrics (Future)
├── Match logging rate
├── Active users
├── Database query times
└── API endpoint performance
```

### Error Tracking

```
Current
├── Console errors (client)
├── Server logs (backend)
└── Cloud Run error logs

Future Enhancement
├── Sentry integration
│   ├── Error tracking
│   ├── Performance monitoring
│   └── User feedback
│
└── Custom error dashboard
    ├── Error frequency
    ├── Error types
    └── Affected users
```

## Disaster Recovery

### Backup Strategy

```
Supabase (Automatic)
├── Daily backups (7 days retention)
├── Point-in-time recovery (paid plans)
└── Manual backups via pg_dump

JSON Mode (Manual)
├── Export via /api/export
├── Download from GCS bucket
└── Store in version control (small datasets)
```

### Recovery Procedures

```
Data Loss Scenarios
├── Accidental deletion
│   └── Restore from latest backup
│
├── Database corruption
│   └── Restore from point-in-time backup
│
└── Complete data loss
    └── Restore from export file
```

## Future Architecture Enhancements

### Real-Time Features

```
WebSocket Integration
├── Replace polling with WebSocket
├── Push updates to clients
└── Reduce server load
```

### Microservices

```
Service Decomposition
├── Auth Service (Firebase)
├── Player Service (CRUD)
├── Match Service (logging + ELO)
├── Tournament Service (brackets)
└── Notification Service (emails/push)
```

### Advanced Analytics

```
Analytics Pipeline
├── Event streaming (Kafka/Pub/Sub)
├── Data warehouse (BigQuery)
├── BI dashboards (Looker/Tableau)
└── ML predictions (win probability)
```

### Mobile Apps

```
Native Mobile
├── React Native app
├── Shared API backend
└── Push notifications
```

## Conclusion

This architecture provides:
- **Scalability**: Cloud Run auto-scales based on demand
- **Reliability**: Multiple database options, automatic backups
- **Security**: JWT authentication, role-based access control
- **Performance**: Optimized builds, efficient queries
- **Maintainability**: Modular code, clear separation of concerns
- **Cost-Effectiveness**: Free tier for small deployments

The system is designed to handle 50-250 active users with room to scale to thousands with minimal changes.
