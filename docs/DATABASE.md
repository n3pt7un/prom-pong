# Database Documentation

## Overview

Cyber-Pong Arcade League supports three database modes:

1. **Supabase PostgreSQL** (recommended for production)
2. **Google Cloud Storage** (legacy JSON file mode)
3. **Local Filesystem** (development only)

## Database Modes

### Supabase PostgreSQL

**Recommended for production** - Provides relational database with ACID guarantees, concurrent access, and built-in backups.

**Configuration:**
```bash
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Advantages:**
- Concurrent access without conflicts
- ACID transactions
- Built-in backups and point-in-time recovery
- SQL queries for complex analytics
- Row-level security
- Real-time subscriptions (future feature)

**Free Tier Limits:**
- 500MB database storage
- 50,000 monthly active users
- 2GB egress bandwidth
- Unlimited API requests

### Google Cloud Storage (Legacy)

JSON file stored in GCS bucket. Used for backward compatibility.

**Configuration:**
```bash
GCS_BUCKET=your-bucket-name
```

**Advantages:**
- Simple JSON structure
- Easy to backup/restore
- No database management

**Disadvantages:**
- No concurrent write protection
- Full file read/write on every operation
- Limited query capabilities

### Local Filesystem (Development)

JSON file stored at `source/db.json`. Automatically used when no other mode is configured.

**Configuration:**
```bash
# No environment variables needed
```

**Use Cases:**
- Local development
- Testing
- Prototyping

## Supabase Schema

### Tables

#### players

Stores player profiles and statistics.

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  bio TEXT,
  elo_singles INTEGER NOT NULL DEFAULT 1200,
  elo_doubles INTEGER NOT NULL DEFAULT 1200,
  wins_singles INTEGER NOT NULL DEFAULT 0,
  losses_singles INTEGER NOT NULL DEFAULT 0,
  streak_singles INTEGER NOT NULL DEFAULT 0,
  wins_doubles INTEGER NOT NULL DEFAULT 0,
  losses_doubles INTEGER NOT NULL DEFAULT 0,
  streak_doubles INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  main_racket_id UUID REFERENCES rackets(id) ON DELETE SET NULL,
  uid TEXT, -- Firebase UID
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_uid ON players(uid);
CREATE INDEX idx_players_league_id ON players(league_id);
CREATE INDEX idx_players_elo_singles ON players(elo_singles DESC);
CREATE INDEX idx_players_elo_doubles ON players(elo_doubles DESC);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `name`: Player display name
- `avatar`: URL or base64 data URI
- `bio`: Optional biography (max 150 chars)
- `elo_singles`: Singles ELO rating
- `elo_doubles`: Doubles ELO rating
- `wins_singles`: Singles wins count
- `losses_singles`: Singles losses count
- `streak_singles`: Current singles streak (positive = wins, negative = losses)
- `wins_doubles`: Doubles wins count
- `losses_doubles`: Doubles losses count
- `streak_doubles`: Current doubles streak
- `joined_at`: Account creation timestamp
- `main_racket_id`: Equipped racket (nullable)
- `uid`: Firebase user ID (nullable for legacy players)
- `league_id`: Assigned league (nullable)

#### matches

Stores confirmed match results.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('singles', 'doubles')),
  score_winner INTEGER NOT NULL,
  score_loser INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  elo_change INTEGER NOT NULL,
  logged_by TEXT, -- Firebase UID
  is_friendly BOOLEAN NOT NULL DEFAULT FALSE,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_timestamp ON matches(timestamp DESC);
CREATE INDEX idx_matches_league_id ON matches(league_id);
CREATE INDEX idx_matches_logged_by ON matches(logged_by);
```

**Columns:**
- `id`: Unique identifier
- `type`: 'singles' or 'doubles'
- `score_winner`: Winner's score
- `score_loser`: Loser's score
- `timestamp`: When match was played
- `elo_change`: ELO points transferred
- `logged_by`: Firebase UID of user who logged the match
- `is_friendly`: If true, no ELO change applied
- `league_id`: League context (nullable)

#### match_winners / match_losers

Junction tables for many-to-many relationships.

```sql
CREATE TABLE match_winners (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE match_losers (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX idx_match_winners_player ON match_winners(player_id);
CREATE INDEX idx_match_losers_player ON match_losers(player_id);
```

#### elo_history

Tracks ELO changes over time for charting.

```sql
CREATE TABLE elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  new_elo INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('singles', 'doubles')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_elo_history_player ON elo_history(player_id, timestamp DESC);
CREATE INDEX idx_elo_history_match ON elo_history(match_id);
```

#### rackets

Stores custom racket designs.

```sql
CREATE TABLE rackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  stats JSONB NOT NULL,
  created_by TEXT, -- Firebase UID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rackets_created_by ON rackets(created_by);
```

**Stats JSONB Structure:**
```json
{
  "speed": 5,
  "spin": 5,
  "power": 5,
  "control": 5,
  "defense": 5,
  "chaos": 5
}
```

**Constraint:** Total stats must equal 30, each stat 0-20 (enforced in application layer).

#### pending_matches

Matches awaiting confirmation from opponents.

```sql
CREATE TABLE pending_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('singles', 'doubles')),
  score_winner INTEGER NOT NULL,
  score_loser INTEGER NOT NULL,
  logged_by TEXT NOT NULL, -- Firebase UID
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'disputed')),
  confirmations TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_friendly BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_pending_matches_status ON pending_matches(status);
CREATE INDEX idx_pending_matches_expires ON pending_matches(expires_at);
```

#### pending_match_winners / pending_match_losers

Junction tables for pending matches.

```sql
CREATE TABLE pending_match_winners (
  pending_match_id UUID NOT NULL REFERENCES pending_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (pending_match_id, player_id)
);

CREATE TABLE pending_match_losers (
  pending_match_id UUID NOT NULL REFERENCES pending_matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (pending_match_id, player_id)
);
```

#### seasons

Tracks competitive seasons.

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  final_standings JSONB,
  match_count INTEGER NOT NULL DEFAULT 0,
  champion_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seasons_status ON seasons(status);
CREATE INDEX idx_seasons_number ON seasons(number DESC);
```

**Final Standings JSONB:**
```json
[
  {
    "playerId": "uuid",
    "playerName": "John Doe",
    "rank": 1,
    "eloSingles": 1650,
    "eloDoubles": 1580,
    "wins": 25,
    "losses": 10
  }
]
```

#### challenges

Player-to-player challenges with ELO wagers.

```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),
  wager INTEGER NOT NULL CHECK (wager >= 0 AND wager <= 50),
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message TEXT
);

CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX idx_challenges_status ON challenges(status);
```

#### tournaments

Tournament brackets and results.

```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('single_elimination', 'round_robin')),
  status TEXT NOT NULL CHECK (status IN ('registration', 'in_progress', 'completed')),
  game_type TEXT NOT NULL CHECK (game_type IN ('singles', 'doubles')),
  player_ids UUID[] NOT NULL,
  rounds JSONB NOT NULL,
  created_by TEXT NOT NULL, -- Firebase UID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
```

**Rounds JSONB Structure:**
```json
[
  {
    "roundNumber": 1,
    "matchups": [
      {
        "id": "matchup-uuid",
        "player1Id": "player-uuid",
        "player2Id": "player-uuid",
        "winnerId": "player-uuid",
        "matchId": "match-uuid",
        "scorePlayer1": 21,
        "scorePlayer2": 18
      }
    ]
  }
]
```

#### leagues

Groups/leagues for organizing players.

```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL, -- Firebase UID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leagues_created_by ON leagues(created_by);
```

#### admins

Stores admin user IDs.

```sql
CREATE TABLE admins (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Relationships

```
players
  ├─ 1:N → matches (via match_winners/match_losers)
  ├─ 1:N → elo_history
  ├─ 1:N → pending_matches (via pending_match_winners/losers)
  ├─ 1:N → challenges (as challenger or challenged)
  ├─ N:1 → rackets (main_racket_id)
  └─ N:1 → leagues (league_id)

matches
  ├─ N:N → players (via match_winners/match_losers)
  ├─ 1:N → elo_history
  └─ N:1 → leagues (league_id)

tournaments
  └─ N:N → players (player_ids array)

seasons
  └─ N:1 → players (champion_id)
```

## Migration from JSON to Supabase

### Migration Script

Located at `scripts/migrate-to-supabase.ts`

**Usage:**
```bash
cd source
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key
export DB_FILE_PATH=./db.json  # optional, defaults to ./db.json

npx tsx ../scripts/migrate-to-supabase.ts
```

**What it does:**
1. Reads JSON file (local or from GCS)
2. Clears existing Supabase data
3. Transforms JSON structure to relational format
4. Inserts data into Supabase tables
5. Reports errors and statistics

**Data Transformations:**
- Match winners/losers arrays → junction tables
- Pending match winners/losers → junction tables
- Racket stats string → JSONB object
- Tournament rounds → JSONB
- Season standings → JSONB

### Rollback

To revert to JSON mode:
```bash
# Remove Supabase env vars
unset USE_SUPABASE
unset SUPABASE_URL
unset SUPABASE_SERVICE_KEY

# Or set USE_SUPABASE=false
export USE_SUPABASE=false
```

The app will fall back to GCS or local filesystem.

## Database Operations

### Supabase Mode

**Read Operations:**
```javascript
// Get all players
const { data: players } = await supabase
  .from('players')
  .select('*')
  .order('elo_singles', { ascending: false });

// Get matches with winners/losers
const { data: matches } = await supabase
  .from('matches')
  .select(`
    *,
    match_winners(player_id),
    match_losers(player_id)
  `)
  .order('timestamp', { ascending: false });
```

**Write Operations:**
```javascript
// Create player
const { data: player } = await supabase
  .from('players')
  .insert({
    name: 'John Doe',
    avatar: 'https://...',
    elo_singles: 1200,
    elo_doubles: 1200
  })
  .select()
  .single();

// Update player ELO
await supabase
  .from('players')
  .update({ elo_singles: 1250 })
  .eq('id', playerId);
```

**Transactions:**
```javascript
// Log match with winners/losers
const { data: match } = await supabase
  .from('matches')
  .insert({
    type: 'singles',
    score_winner: 21,
    score_loser: 19,
    elo_change: 15
  })
  .select()
  .single();

await supabase
  .from('match_winners')
  .insert({ match_id: match.id, player_id: winnerId });

await supabase
  .from('match_losers')
  .insert({ match_id: match.id, player_id: loserId });
```

### JSON Mode

**Read Operations:**
```javascript
// Load entire database
const db = await loadDB();
const players = db.players;
const matches = db.matches;
```

**Write Operations:**
```javascript
// Modify and save
db.players.push(newPlayer);
await saveDB(db);
```

**Limitations:**
- Full file read/write on every operation
- No concurrent write protection
- No transactions
- No indexes

## Backup and Recovery

### Supabase Backups

**Automatic Backups:**
- Daily backups (retained for 7 days on free tier)
- Point-in-time recovery available on paid plans

**Manual Backup:**
```bash
# Export via API
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.run.app/api/export > backup.json

# Or use pg_dump
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

**Restore:**
```bash
# Via import endpoint
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json \
  https://your-app.run.app/api/import

# Or use psql
psql -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

### JSON Backups

**GCS Mode:**
```bash
# Download from GCS
gcloud storage cp gs://your-bucket/db.json ./backup.json

# Upload to GCS
gcloud storage cp ./backup.json gs://your-bucket/db.json
```

**Local Mode:**
```bash
# Copy file
cp source/db.json backup.json
```

## Performance Optimization

### Indexes

All critical queries have indexes:
- Player lookups by UID
- Match queries by timestamp
- ELO history by player and timestamp
- League assignments

### Query Optimization

**Avoid N+1 Queries:**
```javascript
// Bad: N+1 queries
for (const match of matches) {
  const winners = await getPlayers(match.winners);
}

// Good: Single query with join
const matches = await supabase
  .from('matches')
  .select(`
    *,
    match_winners(player:players(*))
  `);
```

**Use Pagination:**
```javascript
const { data, count } = await supabase
  .from('matches')
  .select('*', { count: 'exact' })
  .range(0, 49)
  .order('timestamp', { ascending: false });
```

### Caching

Consider implementing caching for:
- Leaderboard (updates every 5 seconds)
- Player profiles (cache for 30 seconds)
- Historical data (cache for 5 minutes)

## Monitoring

### Supabase Dashboard

Monitor via Supabase dashboard:
- Database size
- Query performance
- Connection count
- Error logs

### Application Metrics

Track in application:
- API response times
- Database query times
- Error rates
- Active users

## Security

### Row-Level Security (RLS)

Consider enabling RLS for production:

```sql
-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all players
CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  USING (true);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON players FOR UPDATE
  USING (uid = auth.uid());
```

### API Security

- All endpoints require Firebase JWT
- Admin endpoints check admin status
- Input validation on all mutations
- SQL injection protection via parameterized queries

## Troubleshooting

### Connection Issues

```javascript
// Check Supabase connection
const { data, error } = await supabase
  .from('players')
  .select('count');

if (error) {
  console.error('Supabase connection failed:', error);
}
```

### Data Inconsistencies

```sql
-- Check for orphaned records
SELECT * FROM match_winners
WHERE player_id NOT IN (SELECT id FROM players);

-- Check ELO history integrity
SELECT COUNT(*) FROM elo_history
WHERE match_id NOT IN (SELECT id FROM matches);
```

### Performance Issues

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM matches
WHERE timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Future Enhancements

- Real-time subscriptions for live updates
- Full-text search for player names
- Advanced analytics with materialized views
- Automated data archival for old seasons
- Multi-region replication
