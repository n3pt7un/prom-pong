# Development Documentation

## Overview

Cyber-Pong Arcade League is a full-stack TypeScript/JavaScript application for managing ping pong leagues with ELO rankings, tournaments, seasons, and player profiles. This document provides comprehensive guidance for developers and AI coding agents working on the codebase.

## Architecture

### Technology Stack

```
Frontend:
├── React 18 (TypeScript)
├── Vite 5 (build tool)
├── Tailwind CSS (via CDN)
├── Recharts (data visualization)
└── Lucide React (icons)

Backend:
├── Express 4 (Node.js 22)
├── Firebase Admin SDK (authentication)
├── Supabase PostgreSQL (primary database)
└── Google Cloud Storage (legacy JSON mode)

Infrastructure:
├── Google Cloud Run (container hosting)
├── Docker (multi-stage builds)
└── Firebase Authentication (Google Sign-In)
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Client                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React SPA (Vite build)                              │   │
│  │  ├─ Context Providers (Auth, League, Toast)          │   │
│  │  ├─ Components (UI layer)                            │   │
│  │  ├─ Services (API client, auth, storage)             │   │
│  │  └─ Utils (calculations, formatting)                 │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │ REST API (JSON)
                      │ Authorization: Bearer <JWT>
┌─────────────────────┼───────────────────────────────────────┐
│  Express Server                                              │
│  ├─ Middleware (auth, admin, CORS)                          │
│  ├─ Routes (modular endpoint handlers)                      │
│  ├─ Services (ELO calculation, tournaments)                 │
│  └─ Database Layer                                          │
│     ├─ Supabase PostgreSQL (recommended)                    │
│     ├─ GCS JSON file (legacy production)                    │
│     └─ Local JSON file (development)                        │
└──────────────────────────────────────────────────────────────┘
```

## Project Structure

```
source/
├── index.html              # Entry HTML with Tailwind config
├── index.tsx               # React entry point
├── App.tsx                 # Root component with routing
├── types.ts                # TypeScript type definitions
├── constants.ts            # App constants (ELO, ranks, presets)
├── achievements.ts         # Achievement definitions
├── firebaseConfig.ts       # Firebase client SDK config
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── Dockerfile              # Multi-stage Docker build
├── package.json            # Dependencies and scripts
│
├── components/             # React UI components
│   ├── Layout.tsx          # Main layout with navigation
│   ├── Leaderboard.tsx     # Rankings table
│   ├── MatchLogger.tsx     # Match entry form
│   ├── PlayersHub.tsx      # Player grid and profiles
│   ├── RacketManager.tsx   # Racket creation/editing
│   ├── TournamentBracket.tsx
│   ├── SeasonManager.tsx
│   ├── ChallengeBoard.tsx
│   └── ... (20+ components)
│
├── context/                # React Context providers
│   ├── AuthContext.tsx     # Firebase auth state
│   ├── LeagueContext.tsx   # League data and polling
│   └── ToastContext.tsx    # Toast notifications
│
├── services/               # API and business logic
│   ├── storageService.ts   # REST API client
│   ├── authService.ts      # Firebase auth operations
│   └── eloService.ts       # ELO calculations
│
├── utils/                  # Utility functions
│   ├── imageUtils.ts       # Image processing
│   ├── statsUtils.ts       # Statistics calculations
│   ├── rivalryUtils.ts     # Head-to-head analysis
│   └── predictionUtils.ts  # Win probability
│
├── hooks/                  # Custom React hooks
│   └── useLeagueHandlers.ts
│
├── lib/                    # External service clients
│   └── supabase.ts         # Supabase client config
│
└── server/                 # Express backend
    ├── index.js            # Server entry point
    ├── config.js           # Environment configuration
    │
    ├── routes/             # API route handlers
    │   ├── state.js        # GET /api/state
    │   ├── me.js           # User profile endpoints
    │   ├── players.js      # Player CRUD
    │   ├── matches.js      # Match logging
    │   ├── rackets.js      # Racket management
    │   ├── pending-matches.js
    │   ├── seasons.js
    │   ├── challenges.js
    │   ├── tournaments.js
    │   ├── leagues.js
    │   ├── admin.js
    │   └── export-import.js
    │
    ├── middleware/         # Express middleware
    │   └── auth.js         # JWT verification
    │
    ├── services/           # Business logic
    │   └── elo.js          # ELO calculation engine
    │
    └── db/                 # Database layer
        ├── persistence.js  # Load/save operations
        ├── operations.js   # CRUD operations
        └── mappers.js      # Data transformation
```

## Development Workflow

### Local Development Setup

1. **Prerequisites**
   ```bash
   # Required
   - Node.js 22+
   - npm or yarn
   - gcloud CLI (for Firebase auth)
   
   # Optional
   - Docker (for container testing)
   - Supabase account (for PostgreSQL)
   ```

2. **Installation**
   ```bash
   cd source
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Firebase Authentication Setup**
   ```bash
   # Authenticate for local development
   gcloud auth application-default login
   ```

5. **Start Development Servers**
   ```bash
   npm run dev
   # Starts:
   # - Vite dev server on http://localhost:5173
   # - Express API server on http://localhost:8080
   # - Vite proxies /api/* to Express
   ```

### Development Scripts

```json
{
  "dev": "concurrently \"vite\" \"npx tsx server/index.js\"",
  "build": "vite build",
  "preview": "vite preview",
  "start": "npx tsx server/index.js"
}
```

- `npm run dev` - Development mode with hot reload
- `npm run build` - Production build to `dist/`
- `npm run preview` - Preview production build locally
- `npm start` - Run production server

## Core Concepts

### Authentication Flow

1. **Client-Side (Firebase SDK)**
   ```typescript
   // User signs in with Google
   const result = await signInWithPopup(auth, googleProvider);
   const user = result.user;
   
   // Get ID token for API calls
   const token = await user.getIdToken();
   ```

2. **API Requests**
   ```typescript
   // All API calls include JWT
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

3. **Server-Side Verification**
   ```javascript
   // Middleware verifies token
   const decodedToken = await admin.auth().verifyIdToken(token);
   req.user = {
     uid: decodedToken.uid,
     email: decodedToken.email,
     // ...
   };
   ```

### Data Flow

1. **State Management**
   - `LeagueContext` manages global state (players, matches, etc.)
   - Polls `/api/state` every 5 seconds
   - Components consume via `useLeague()` hook

2. **Data Fetching**
   ```typescript
   // LeagueContext.tsx
   const fetchData = async () => {
     const data = await storageService.getState();
     setPlayers(data.players);
     setMatches(data.matches);
     // ...
   };
   ```

3. **Data Mutations**
   ```typescript
   // Component calls handler
   await handleMatchSubmit(type, winners, losers, scoreW, scoreL);
   
   // Handler calls API
   await storageService.logMatch({ type, winners, losers, ... });
   
   // Context refreshes data
   await refreshData();
   ```

### ELO Rating System

**Formula:**
```javascript
// Expected score
E = 1 / (1 + 10^((opponentElo - playerElo) / 400))

// New rating
newElo = oldElo + K * (actualScore - expectedScore)
```

**Parameters:**
- K-factor: 32
- Initial ELO: 1200
- Separate ratings for singles and doubles

**Implementation:**
```javascript
// server/services/elo.js
export function calculateEloChange(winnerElo, loserElo, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const change = Math.round(kFactor * (1 - expectedWinner));
  return change;
}
```

### Database Modes

The application supports three database modes:

1. **Supabase PostgreSQL** (recommended for production)
   ```javascript
   USE_SUPABASE=true
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=your-key
   ```

2. **Google Cloud Storage** (legacy production)
   ```javascript
   GCS_BUCKET=your-bucket-name
   ```

3. **Local Filesystem** (development)
   ```javascript
   // No env vars needed
   // Uses source/db.json
   ```

## API Reference

### Authentication

All endpoints except health checks require authentication via Firebase JWT.

**Request Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### Endpoints

#### State Management

**GET /api/state**
- Returns complete league state
- Response: `{ players, matches, history, rackets, pendingMatches, seasons, challenges, tournaments, leagues }`

#### User Profile

**GET /api/me**
- Get current user profile
- Response: `{ uid, email, displayName, photoURL, isAdmin, player, needsSetup }`

**POST /api/me/setup**
- First-time profile creation
- Body: `{ name, avatar, bio }`

**PUT /api/me/profile**
- Update own profile
- Body: `{ name?, avatar?, bio? }`

**POST /api/me/claim**
- Claim unlinked player account
- Body: `{ playerId }`

#### Players

**POST /api/players**
- Create new player
- Body: `{ name, avatar?, mainRacketId? }`
- Auth: User

**PUT /api/players/:id**
- Update player
- Body: `{ name?, avatar?, bio?, mainRacketId? }`
- Auth: User (own profile) or Admin

**DELETE /api/players/:id**
- Delete player
- Auth: Admin only

#### Matches

**POST /api/matches**
- Log a match
- Body: `{ type, winners[], losers[], scoreWinner, scoreLoser, isFriendly?, leagueId? }`
- Creates pending match requiring confirmation

**PUT /api/matches/:id**
- Edit match (recalculates ELO)
- Body: `{ scoreWinner?, scoreLoser? }`
- Auth: Admin only

**DELETE /api/matches/:id**
- Delete match and reverse ELO
- Auth: Admin only

#### Pending Matches

**POST /api/pending-matches**
- Create pending match
- Body: `{ type, winners[], losers[], scoreWinner, scoreLoser, isFriendly? }`

**PUT /api/pending-matches/:id/confirm**
- Confirm pending match
- Auth: Involved player

**PUT /api/pending-matches/:id/dispute**
- Dispute pending match
- Auth: Involved player

**PUT /api/pending-matches/:id/force-confirm**
- Force confirm disputed match
- Auth: Admin only

**DELETE /api/pending-matches/:id**
- Reject pending match
- Auth: Admin only

#### Rackets

**POST /api/rackets**
- Create racket
- Body: `{ name, icon, color, stats }`
- Validates 30-point stat budget

**PUT /api/rackets/:id**
- Update racket
- Body: `{ name?, icon?, color?, stats? }`

**DELETE /api/rackets/:id**
- Delete racket
- Auth: Admin only

#### Seasons

**POST /api/seasons/start**
- Start new season
- Body: `{ name }`
- Auth: Admin only

**POST /api/seasons/end**
- End active season
- Archives final standings
- Auth: Admin only

#### Challenges

**POST /api/challenges**
- Send challenge
- Body: `{ challengedId, wager, message? }`
- Wager: 0-50 ELO points

**PUT /api/challenges/:id/respond**
- Accept/decline challenge
- Body: `{ action: 'accept' | 'decline' }`

**PUT /api/challenges/:id/complete**
- Complete challenge (link to match)
- Body: `{ matchId }`

#### Tournaments

**POST /api/tournaments**
- Create tournament
- Body: `{ name, format, gameType, playerIds[] }`
- Format: 'single_elimination' | 'round_robin'

**PUT /api/tournaments/:id/results**
- Submit tournament match result
- Body: `{ matchupId, winnerId, scorePlayer1, scorePlayer2 }`

**DELETE /api/tournaments/:id**
- Delete tournament
- Auth: Admin only

#### Leagues

**POST /api/leagues**
- Create league
- Body: `{ name, description? }`

**PUT /api/leagues/:id**
- Update league
- Body: `{ name?, description? }`

**DELETE /api/leagues/:id**
- Delete league
- Auth: Admin only

**POST /api/leagues/:id/assign-player**
- Assign player to league
- Body: `{ playerId }`

#### Admin

**GET /api/admin/users**
- List all users
- Auth: Admin only

**POST /api/admin/promote**
- Promote user to admin
- Body: `{ uid }`
- Auth: Admin only

**POST /api/admin/demote**
- Demote admin to user
- Body: `{ uid }`
- Auth: Admin only (cannot demote self)

#### Data Management

**GET /api/export**
- Export all data as JSON
- Auth: User

**POST /api/import**
- Import data (overwrites)
- Body: `{ players, matches, ... }`
- Auth: Admin only

**POST /api/reset**
- Reset data
- Body: `{ mode: 'season' | 'wipe' | 'fresh' }`
- Auth: Admin only

## Component Guide

### Creating New Components

1. **Component Template**
   ```typescript
   import React from 'react';
   import { Player, Match } from '../types';
   
   interface MyComponentProps {
     players: Player[];
     onAction: (id: string) => void;
   }
   
   export default function MyComponent({ players, onAction }: MyComponentProps) {
     return (
       <div className="glass-panel p-6">
         <h2 className="text-2xl font-display text-cyber-cyan mb-4">
           My Component
         </h2>
         {/* Component content */}
       </div>
     );
   }
   ```

2. **Styling Guidelines**
   - Use Tailwind utility classes
   - Follow cyberpunk theme colors:
     - `cyber-cyan` (#00f3ff)
     - `cyber-pink` (#ff00ff)
     - `cyber-purple` (#bc13fe)
     - `cyber-yellow` (#fcee0a)
   - Use `glass-panel` class for containers
   - Use `font-display` (Orbitron) for headings
   - Use `font-mono` (JetBrains Mono) for data

3. **State Management**
   - Consume global state via `useLeague()` hook
   - Pass handlers down from parent components
   - Use local state for UI-only concerns

### Common Patterns

**Loading States:**
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="animate-spin text-cyber-cyan" size={32} />
    </div>
  );
}
```

**Empty States:**
```typescript
if (items.length === 0) {
  return (
    <div className="text-center text-gray-500 py-8">
      <Info size={48} className="mx-auto mb-4 opacity-50" />
      <p>No items found</p>
    </div>
  );
}
```

**Error Handling:**
```typescript
try {
  await apiCall();
  showToast('Success!', 'success');
} catch (error) {
  showToast(error.message || 'Operation failed', 'error');
}
```

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Google Sign-In works
- [ ] Profile setup for new users
- [ ] Account claiming for existing players
- [ ] Admin promotion/demotion

**Match Logging:**
- [ ] Singles match logging
- [ ] Doubles match logging
- [ ] Score validation
- [ ] ELO calculation accuracy
- [ ] Pending match confirmation
- [ ] Match dispute flow

**Player Management:**
- [ ] Create player
- [ ] Update player profile
- [ ] Delete player (admin)
- [ ] Racket assignment

**Tournaments:**
- [ ] Create single elimination
- [ ] Create round robin
- [ ] Submit results
- [ ] Bracket progression

**Seasons:**
- [ ] Start season
- [ ] End season
- [ ] Final standings archive

**Data Management:**
- [ ] Export data
- [ ] Import data
- [ ] Season reset
- [ ] Factory reset

### Testing Locally

```bash
# Start dev servers
npm run dev

# Test API endpoints
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/state

# Build and test production
npm run build
npm start
```

## Deployment

### Docker Build

```dockerfile
# Multi-stage build
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/lib ./lib
COPY package*.json ./
RUN npm install --production
EXPOSE 8080
CMD ["npx", "tsx", "server/index.js"]
```

### Cloud Run Deployment

```bash
# Deploy with Supabase
gcloud run deploy cyber-pong-arcade-league \
  --source=. \
  --region=us-west1 \
  --allow-unauthenticated \
  --set-env-vars="USE_SUPABASE=true,SUPABASE_URL=https://xxx.supabase.co,SUPABASE_SERVICE_KEY=xxx,ADMIN_EMAILS=admin@example.com" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3
```

### Environment Variables

**Required:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `ADMIN_EMAILS` (comma-separated)

**Database (choose one):**
- Supabase: `USE_SUPABASE=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- GCS: `GCS_BUCKET`
- Local: (no vars needed)

## Troubleshooting

### Common Issues

**"Firebase Auth: popup blocked"**
- Add domain to Firebase Console > Authentication > Settings > Authorized domains

**"401 Authentication required"**
- Check Firebase config in `.env`
- Verify `gcloud auth application-default login` for local dev
- Check JWT token is being sent in headers

**"ELO not updating"**
- Check pending match confirmation status
- Verify match was confirmed (not disputed)
- Check server logs for calculation errors

**"Data not persisting"**
- Verify database mode (Supabase/GCS/local)
- Check environment variables
- For GCS: verify service account permissions

**"Build fails"**
- Clear `node_modules` and reinstall
- Check Node.js version (requires 22+)
- Verify all dependencies in `package.json`

### Debug Mode

Enable verbose logging:
```javascript
// server/index.js
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});
```

## Best Practices

### Code Style

- Use TypeScript for type safety
- Follow functional component patterns
- Use async/await over promises
- Handle errors gracefully
- Add JSDoc comments for complex functions

### Performance

- Minimize re-renders with `React.memo`
- Use `useMemo` for expensive calculations
- Debounce API calls where appropriate
- Optimize images (200x200 max for avatars)

### Security

- Never expose Firebase service account keys
- Validate all user inputs
- Use parameterized queries (Supabase)
- Implement rate limiting for production
- Sanitize user-generated content

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Test with screen readers

## Contributing

### Adding New Features

1. **Plan the feature**
   - Define requirements
   - Design data model changes
   - Plan API endpoints

2. **Implement backend**
   - Add database schema (if needed)
   - Create API routes
   - Add business logic
   - Test endpoints

3. **Implement frontend**
   - Create/update components
   - Add API client methods
   - Update context if needed
   - Style with Tailwind

4. **Test thoroughly**
   - Manual testing
   - Edge cases
   - Error handling
   - Mobile responsiveness

5. **Document**
   - Update API reference
   - Add code comments
   - Update user guide if needed

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] API endpoints are secured
- [ ] UI is responsive
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Documentation is updated

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Express Documentation](https://expressjs.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
