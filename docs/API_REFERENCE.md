# API Reference

Complete reference for all REST API endpoints in Cyber-Pong Arcade League.

## Base URL

- **Local Development:** `http://localhost:8080`
- **Production:** `https://your-app.run.app`

## Authentication

All endpoints require authentication unless marked as public. Include Firebase ID token in request headers:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### Getting a Token

```javascript
// Client-side (Firebase SDK)
const user = auth.currentUser;
const token = await user.getIdToken();
```

### Authorization Levels

- **User:** Any authenticated user
- **Admin:** User with admin privileges
- **Owner:** User who created the resource or owns the profile

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "error": "Error message description"
}
```

## Endpoints

### State Management

#### Get Complete State

```http
GET /api/state
```

Returns all league data in a single request.

**Auth:** User

**Response:**
```json
{
  "players": Player[],
  "matches": Match[],
  "history": EloHistoryEntry[],
  "rackets": Racket[],
  "pendingMatches": PendingMatch[],
  "seasons": Season[],
  "challenges": Challenge[],
  "tournaments": Tournament[],
  "leagues": League[]
}
```

**Example:**
```javascript
const response = await fetch('/api/state', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

---

### User Profile

#### Get Current User

```http
GET /api/me
```

Get authenticated user's profile and linked player.

**Auth:** User

**Response:**
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "isAdmin": false,
  "player": Player | null,
  "needsSetup": false
}
```

#### Setup Profile

```http
POST /api/me/setup
```

First-time profile creation for new users.

**Auth:** User

**Body:**
```json
{
  "name": "Player Name",
  "avatar": "https://..." | "data:image/...",
  "bio": "Optional bio text"
}
```

**Response:**
```json
{
  "player": Player
}
```

#### Update Profile

```http
PUT /api/me/profile
```

Update own profile information.

**Auth:** User

**Body:**
```json
{
  "name": "New Name",
  "avatar": "https://...",
  "bio": "Updated bio"
}
```

**Response:**
```json
{
  "player": Player
}
```

#### Claim Player Account

```http
POST /api/me/claim
```

Link Google account to existing unlinked player profile.

**Auth:** User

**Body:**
```json
{
  "playerId": "player-uuid"
}
```

**Response:**
```json
{
  "player": Player
}
```

---

### Players

#### Create Player

```http
POST /api/players
```

Create a new player profile.

**Auth:** User

**Body:**
```json
{
  "name": "Player Name",
  "avatar": "https://..." | "data:image/...",
  "mainRacketId": "racket-uuid" // optional
}
```

**Response:**
```json
{
  "player": Player
}
```

**Validation:**
- Name: 1-50 characters
- Avatar: Valid URL or base64 data URI
- mainRacketId: Must exist if provided

#### Update Player

```http
PUT /api/players/:id
```

Update player information.

**Auth:** User (own profile) or Admin

**Body:**
```json
{
  "name": "New Name",
  "avatar": "https://...",
  "bio": "Updated bio",
  "mainRacketId": "racket-uuid"
}
```

**Response:**
```json
{
  "player": Player
}
```

#### Delete Player

```http
DELETE /api/players/:id
```

Delete a player. Match history is preserved.

**Auth:** Admin

**Response:**
```json
{
  "success": true
}
```

---

### Matches

#### Log Match

```http
POST /api/matches
```

Log a new match. Creates a pending match requiring confirmation.

**Auth:** User

**Body:**
```json
{
  "type": "singles" | "doubles",
  "winners": ["player-id-1", "player-id-2"],
  "losers": ["player-id-3", "player-id-4"],
  "scoreWinner": 21,
  "scoreLoser": 19,
  "isFriendly": false,
  "leagueId": "league-uuid" // optional
}
```

**Validation:**
- Singles: 1 winner, 1 loser
- Doubles: 2 winners, 2 losers
- Score: Winner score > Loser score
- All player IDs must exist

**Response:**
```json
{
  "pendingMatch": PendingMatch
}
```

#### Edit Match

```http
PUT /api/matches/:id
```

Edit match scores. Recalculates ELO for all involved players.

**Auth:** Admin

**Body:**
```json
{
  "scoreWinner": 21,
  "scoreLoser": 18
}
```

**Response:**
```json
{
  "match": Match
}
```

#### Delete Match

```http
DELETE /api/matches/:id
```

Delete match and reverse ELO changes. Streaks are reset to 0.

**Auth:** Admin

**Response:**
```json
{
  "success": true
}
```

---

### Pending Matches

#### Create Pending Match

```http
POST /api/pending-matches
```

Create a match that requires confirmation from opponents.

**Auth:** User

**Body:**
```json
{
  "type": "singles" | "doubles",
  "winners": ["player-id-1"],
  "losers": ["player-id-2"],
  "scoreWinner": 21,
  "scoreLoser": 19,
  "isFriendly": false
}
```

**Response:**
```json
{
  "pendingMatch": PendingMatch
}
```

**Auto-confirmation:**
- Matches auto-confirm after 24 hours
- Checked on each `/api/state` request

#### Confirm Pending Match

```http
PUT /api/pending-matches/:id/confirm
```

Confirm a pending match. When all players confirm, ELO is applied.

**Auth:** User (must be involved in match)

**Response:**
```json
{
  "pendingMatch": PendingMatch,
  "confirmed": true,
  "match": Match // if fully confirmed
}
```

#### Dispute Pending Match

```http
PUT /api/pending-matches/:id/dispute
```

Dispute an incorrect match entry.

**Auth:** User (must be involved in match)

**Response:**
```json
{
  "pendingMatch": PendingMatch
}
```

#### Force Confirm Match

```http
PUT /api/pending-matches/:id/force-confirm
```

Admin override to confirm disputed or pending match.

**Auth:** Admin

**Response:**
```json
{
  "match": Match
}
```

#### Reject Pending Match

```http
DELETE /api/pending-matches/:id
```

Reject and delete a pending match.

**Auth:** Admin

**Response:**
```json
{
  "success": true
}
```

---

### Rackets

#### Create Racket

```http
POST /api/rackets
```

Create a custom racket with stats.

**Auth:** User

**Body:**
```json
{
  "name": "Speed Demon",
  "icon": "Zap",
  "color": "#00f3ff",
  "stats": {
    "speed": 18,
    "spin": 5,
    "power": 3,
    "control": 2,
    "defense": 1,
    "chaos": 1
  }
}
```

**Validation:**
- Name: 1-50 characters
- Icon: Valid Lucide icon name
- Color: Valid hex color
- Stats: Total must equal 30, each 0-20

**Response:**
```json
{
  "racket": Racket
}
```

#### Update Racket

```http
PUT /api/rackets/:id
```

Update racket properties.

**Auth:** User

**Body:**
```json
{
  "name": "New Name",
  "icon": "Shield",
  "color": "#ff00ff",
  "stats": { ... }
}
```

**Response:**
```json
{
  "racket": Racket
}
```

#### Delete Racket

```http
DELETE /api/rackets/:id
```

Delete a racket. Unequips from all players.

**Auth:** Admin

**Response:**
```json
{
  "success": true
}
```

---

### Seasons

#### Start Season

```http
POST /api/seasons/start
```

Start a new season. Only one season can be active at a time.

**Auth:** Admin

**Body:**
```json
{
  "name": "Spring 2024"
}
```

**Response:**
```json
{
  "season": Season
}
```

#### End Season

```http
POST /api/seasons/end
```

End the active season. Archives final standings and determines champion.

**Auth:** Admin

**Response:**
```json
{
  "season": Season
}
```

**Season Data:**
- Final standings (rank, ELO, wins, losses)
- Champion (highest ELO player)
- Total match count
- End timestamp

---

### Challenges

#### Create Challenge

```http
POST /api/challenges
```

Challenge another player with optional ELO wager.

**Auth:** User

**Body:**
```json
{
  "challengedId": "player-uuid",
  "wager": 25,
  "message": "Let's settle this!"
}
```

**Validation:**
- Wager: 0-50 ELO points
- Cannot challenge self
- Challenged player must exist

**Response:**
```json
{
  "challenge": Challenge
}
```

#### Respond to Challenge

```http
PUT /api/challenges/:id/respond
```

Accept or decline a challenge.

**Auth:** User (must be challenged player)

**Body:**
```json
{
  "action": "accept" | "decline"
}
```

**Response:**
```json
{
  "challenge": Challenge
}
```

#### Complete Challenge

```http
PUT /api/challenges/:id/complete
```

Link a match to complete the challenge. Winner receives bonus ELO.

**Auth:** User (must be involved in challenge)

**Body:**
```json
{
  "matchId": "match-uuid"
}
```

**Response:**
```json
{
  "challenge": Challenge
}
```

**Wager Application:**
- Winner gains wager amount (in addition to normal ELO)
- Loser loses wager amount (in addition to normal ELO)

---

### Tournaments

#### Create Tournament

```http
POST /api/tournaments
```

Create a new tournament with automatic bracket generation.

**Auth:** User

**Body:**
```json
{
  "name": "Summer Championship",
  "format": "single_elimination" | "round_robin",
  "gameType": "singles" | "doubles",
  "playerIds": ["player-1", "player-2", "player-3", "player-4"]
}
```

**Validation:**
- Single elimination: 2+ players
- Round robin: 2+ players
- All player IDs must exist

**Response:**
```json
{
  "tournament": Tournament
}
```

**Bracket Generation:**
- Single elimination: Byes added if not power of 2
- Round robin: All unique pairings generated

#### Submit Tournament Result

```http
PUT /api/tournaments/:id/results
```

Submit a match result in the tournament.

**Auth:** User

**Body:**
```json
{
  "matchupId": "matchup-uuid",
  "winnerId": "player-uuid",
  "scorePlayer1": 21,
  "scorePlayer2": 18
}
```

**Response:**
```json
{
  "tournament": Tournament
}
```

**Progression:**
- Single elimination: Winner advances to next round
- Round robin: Win count incremented
- Tournament completes when all matchups have results

#### Delete Tournament

```http
DELETE /api/tournaments/:id
```

Delete a tournament.

**Auth:** Admin

**Response:**
```json
{
  "success": true
}
```

---

### Leagues

#### Create League

```http
POST /api/leagues
```

Create a new league/group.

**Auth:** User

**Body:**
```json
{
  "name": "Office League",
  "description": "Weekly office matches"
}
```

**Response:**
```json
{
  "league": League
}
```

#### Update League

```http
PUT /api/leagues/:id
```

Update league information.

**Auth:** Admin or League Creator

**Body:**
```json
{
  "name": "Updated Name",
  "description": "New description"
}
```

**Response:**
```json
{
  "league": League
}
```

#### Delete League

```http
DELETE /api/leagues/:id
```

Delete a league. Players remain but are unassigned.

**Auth:** Admin

**Response:**
```json
{
  "success": true
}
```

#### Assign Player to League

```http
POST /api/leagues/:id/assign-player
```

Assign a player to a league.

**Auth:** Admin or League Creator

**Body:**
```json
{
  "playerId": "player-uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Admin

#### List Users

```http
GET /api/admin/users
```

Get all registered users with admin status.

**Auth:** Admin

**Response:**
```json
{
  "users": [
    {
      "uid": "firebase-uid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "isAdmin": false,
      "player": Player | null
    }
  ]
}
```

#### Promote User

```http
POST /api/admin/promote
```

Grant admin privileges to a user.

**Auth:** Admin

**Body:**
```json
{
  "uid": "firebase-uid"
}
```

**Response:**
```json
{
  "success": true
}
```

#### Demote User

```http
POST /api/admin/demote
```

Remove admin privileges from a user. Cannot demote self.

**Auth:** Admin

**Body:**
```json
{
  "uid": "firebase-uid"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Data Management

#### Export Data

```http
GET /api/export
```

Export all league data as JSON file.

**Auth:** User

**Response:**
```json
{
  "players": Player[],
  "matches": Match[],
  "history": EloHistoryEntry[],
  "rackets": Racket[],
  "pendingMatches": PendingMatch[],
  "seasons": Season[],
  "challenges": Challenge[],
  "tournaments": Tournament[],
  "leagues": League[],
  "admins": string[],
  "exportedAt": "2024-02-11T10:30:00Z"
}
```

#### Import Data

```http
POST /api/import
```

Import league data. Overwrites existing data.

**Auth:** Admin

**Body:**
```json
{
  "players": Player[],
  "matches": Match[],
  "history": EloHistoryEntry[],
  "rackets": Racket[],
  "pendingMatches": PendingMatch[],
  "seasons": Season[],
  "challenges": Challenge[],
  "tournaments": Tournament[],
  "leagues": League[],
  "admins": string[]
}
```

**Response:**
```json
{
  "success": true
}
```

#### Reset Data

```http
POST /api/reset
```

Reset league data with different modes.

**Auth:** Admin

**Body:**
```json
{
  "mode": "season" | "wipe" | "fresh"
}
```

**Modes:**
- `season`: Keep players, clear stats and matches
- `wipe`: Clear all data except admins
- `fresh`: Complete reset including admins

**Response:**
```json
{
  "success": true
}
```

---

## Data Types

### Player

```typescript
interface Player {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  eloSingles: number;
  eloDoubles: number;
  winsSingles: number;
  lossesSingles: number;
  streakSingles: number;
  winsDoubles: number;
  lossesDoubles: number;
  streakDoubles: number;
  joinedAt: string; // ISO timestamp
  mainRacketId?: string;
  uid?: string; // Firebase UID
  leagueId?: string;
}
```

### Match

```typescript
interface Match {
  id: string;
  type: 'singles' | 'doubles';
  winners: string[]; // Player IDs
  losers: string[];
  scoreWinner: number;
  scoreLoser: number;
  timestamp: string; // ISO timestamp
  eloChange: number;
  loggedBy?: string; // Firebase UID
  isFriendly?: boolean;
  leagueId?: string;
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
  loggedBy: string; // Firebase UID
  status: 'pending' | 'confirmed' | 'disputed';
  confirmations: string[]; // UIDs who confirmed
  createdAt: string; // ISO timestamp
  expiresAt: string; // Auto-confirm deadline (24h)
  isFriendly?: boolean;
}
```

### Racket

```typescript
interface Racket {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex color
  stats: {
    speed: number;
    spin: number;
    power: number;
    control: number;
    defense: number;
    chaos: number;
  };
  createdBy?: string; // Firebase UID
}
```

### Season

```typescript
interface Season {
  id: string;
  name: string;
  number: number;
  status: 'active' | 'completed';
  startedAt: string; // ISO timestamp
  endedAt?: string;
  finalStandings: {
    playerId: string;
    playerName: string;
    rank: number;
    eloSingles: number;
    eloDoubles: number;
    wins: number;
    losses: number;
  }[];
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
  wager: number; // 0-50 ELO points
  matchId?: string;
  createdAt: string; // ISO timestamp
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
  rounds: {
    roundNumber: number;
    matchups: {
      id: string;
      player1Id: string | null;
      player2Id: string | null;
      winnerId?: string;
      matchId?: string;
      scorePlayer1?: number;
      scorePlayer2?: number;
    }[];
  }[];
  createdBy: string; // Firebase UID
  createdAt: string; // ISO timestamp
  completedAt?: string;
  winnerId?: string;
}
```

### League

```typescript
interface League {
  id: string;
  name: string;
  description?: string;
  createdBy: string; // Firebase UID
  createdAt: string; // ISO timestamp
}
```

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Internal Server Error |

## Rate Limiting

Currently no rate limiting is implemented. For production use, consider adding rate limiting middleware.

## Webhooks

Webhooks are not currently supported. Consider implementing for real-time notifications.

## Versioning

API is currently unversioned. Breaking changes will be documented in release notes.
