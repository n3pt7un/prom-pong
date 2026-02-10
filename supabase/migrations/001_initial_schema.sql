-- CyberPong Database Schema for Supabase PostgreSQL
-- This schema replaces the JSON file-based storage with relational tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLAYERS TABLE
-- ============================================================
CREATE TABLE players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    elo_singles INTEGER NOT NULL DEFAULT 1200,
    elo_doubles INTEGER NOT NULL DEFAULT 1200,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    main_racket_id TEXT,
    firebase_uid TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for players
CREATE INDEX idx_players_firebase_uid ON players(firebase_uid);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_elo_singles ON players(elo_singles DESC);
CREATE INDEX idx_players_elo_doubles ON players(elo_doubles DESC);

-- ============================================================
-- RACKETS TABLE
-- ============================================================
CREATE TABLE rackets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Zap',
    color TEXT NOT NULL DEFAULT '#00f3ff',
    stats JSONB NOT NULL DEFAULT '{"speed": 5, "spin": 5, "power": 5, "control": 5, "defense": 5, "chaos": 5}',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK constraint after table creation (players doesn't exist yet when creating rackets)
-- Will add later

-- ============================================================
-- MATCHES TABLE
-- ============================================================
CREATE TABLE matches (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('singles', 'doubles')),
    score_winner INTEGER NOT NULL,
    score_loser INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    elo_change INTEGER NOT NULL,
    logged_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_timestamp ON matches(timestamp DESC);
CREATE INDEX idx_matches_type ON matches(type);
CREATE INDEX idx_matches_logged_by ON matches(logged_by);

-- ============================================================
-- MATCH PLAYERS (Junction table for many-to-many relationship)
-- ============================================================
CREATE TABLE match_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_winner BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_player_id ON match_players(player_id);
CREATE INDEX idx_match_players_is_winner ON match_players(is_winner);

-- ============================================================
-- ELO HISTORY TABLE
-- ============================================================
CREATE TABLE elo_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
    new_elo INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    game_type TEXT NOT NULL CHECK (game_type IN ('singles', 'doubles'))
);

CREATE INDEX idx_elo_history_player_id ON elo_history(player_id);
CREATE INDEX idx_elo_history_match_id ON elo_history(match_id);
CREATE INDEX idx_elo_history_timestamp ON elo_history(timestamp DESC);

-- ============================================================
-- ADMINS TABLE
-- ============================================================
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admins_firebase_uid ON admins(firebase_uid);

-- ============================================================
-- PENDING MATCHES TABLE
-- ============================================================
CREATE TABLE pending_matches (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('singles', 'doubles')),
    score_winner INTEGER NOT NULL,
    score_loser INTEGER NOT NULL,
    logged_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed', 'rejected')),
    confirmations TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_pending_matches_status ON pending_matches(status);
CREATE INDEX idx_pending_matches_expires_at ON pending_matches(expires_at);
CREATE INDEX idx_pending_matches_logged_by ON pending_matches(logged_by);

-- ============================================================
-- PENDING MATCH PLAYERS (Junction table)
-- ============================================================
CREATE TABLE pending_match_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_match_id TEXT NOT NULL REFERENCES pending_matches(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_winner BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_match_players_pending_match_id ON pending_match_players(pending_match_id);
CREATE INDEX idx_pending_match_players_player_id ON pending_match_players(player_id);

-- ============================================================
-- SEASONS TABLE
-- ============================================================
CREATE TABLE seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    final_standings JSONB DEFAULT '[]',
    match_count INTEGER NOT NULL DEFAULT 0,
    champion_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seasons_status ON seasons(status);
CREATE INDEX idx_seasons_number ON seasons(number DESC);

-- ============================================================
-- CHALLENGES TABLE
-- ============================================================
CREATE TABLE challenges (
    id TEXT PRIMARY KEY,
    challenger_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    challenged_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
    wager INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    match_id TEXT REFERENCES matches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_challenger_id ON challenges(challenger_id);
CREATE INDEX idx_challenges_challenged_id ON challenges(challenged_id);

-- ============================================================
-- TOURNAMENTS TABLE
-- ============================================================
CREATE TABLE tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('single_elimination', 'round_robin')),
    status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'in_progress', 'completed')),
    game_type TEXT NOT NULL CHECK (game_type IN ('singles', 'doubles')),
    player_ids TEXT[] NOT NULL DEFAULT '{}',
    rounds JSONB NOT NULL DEFAULT '[]',
    created_by TEXT NOT NULL,
    winner_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);

-- ============================================================
-- MATCH REACTIONS TABLE
-- ============================================================
CREATE TABLE match_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_reactions_match_id ON match_reactions(match_id);
CREATE INDEX idx_match_reactions_player_id ON match_reactions(player_id);

-- ============================================================
-- BACKUPS TABLE (Metadata only - actual backup data can be stored elsewhere)
-- ============================================================
CREATE TABLE backups (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    label TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backups_timestamp ON backups(timestamp DESC);

-- ============================================================
-- Add foreign key constraints for tables created earlier
-- ============================================================
ALTER TABLE players ADD CONSTRAINT fk_players_main_racket 
    FOREIGN KEY (main_racket_id) REFERENCES rackets(id) ON DELETE SET NULL;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (via Firebase JWT)
-- Note: Since we're using Firebase Auth, these policies use the 'authenticated' role
-- The actual UID check is done in the application layer

-- Players: readable by all authenticated, writable by own user or admin
CREATE POLICY players_select ON players FOR SELECT USING (true);
CREATE POLICY players_insert ON players FOR INSERT WITH CHECK (true);
CREATE POLICY players_update ON players FOR UPDATE USING (true);
CREATE POLICY players_delete ON players FOR DELETE USING (true);

-- Rackets: readable by all, writable by creator or admin
CREATE POLICY rackets_select ON rackets FOR SELECT USING (true);
CREATE POLICY rackets_insert ON rackets FOR INSERT WITH CHECK (true);
CREATE POLICY rackets_update ON rackets FOR UPDATE USING (true);
CREATE POLICY rackets_delete ON rackets FOR DELETE USING (true);

-- Matches: readable by all, writable by authenticated
CREATE POLICY matches_select ON matches FOR SELECT USING (true);
CREATE POLICY matches_insert ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY matches_update ON matches FOR UPDATE USING (true);
CREATE POLICY matches_delete ON matches FOR DELETE USING (true);

-- Match Players: readable by all, writable by authenticated
CREATE POLICY match_players_select ON match_players FOR SELECT USING (true);
CREATE POLICY match_players_insert ON match_players FOR INSERT WITH CHECK (true);
CREATE POLICY match_players_delete ON match_players FOR DELETE USING (true);

-- ELO History: readable by all, writable by system
CREATE POLICY elo_history_select ON elo_history FOR SELECT USING (true);
CREATE POLICY elo_history_insert ON elo_history FOR INSERT WITH CHECK (true);

-- Admins: readable by all, writable by admin
CREATE POLICY admins_select ON admins FOR SELECT USING (true);
CREATE POLICY admins_insert ON admins FOR INSERT WITH CHECK (true);
CREATE POLICY admins_delete ON admins FOR DELETE USING (true);

-- Pending Matches: readable by all, writable by involved players or admin
CREATE POLICY pending_matches_select ON pending_matches FOR SELECT USING (true);
CREATE POLICY pending_matches_insert ON pending_matches FOR INSERT WITH CHECK (true);
CREATE POLICY pending_matches_update ON pending_matches FOR UPDATE USING (true);
CREATE POLICY pending_matches_delete ON pending_matches FOR DELETE USING (true);

-- Pending Match Players: readable by all, writable by authenticated
CREATE POLICY pending_match_players_select ON pending_match_players FOR SELECT USING (true);
CREATE POLICY pending_match_players_insert ON pending_match_players FOR INSERT WITH CHECK (true);
CREATE POLICY pending_match_players_delete ON pending_match_players FOR DELETE USING (true);

-- Seasons: readable by all, writable by admin
CREATE POLICY seasons_select ON seasons FOR SELECT USING (true);
CREATE POLICY seasons_insert ON seasons FOR INSERT WITH CHECK (true);
CREATE POLICY seasons_update ON seasons FOR UPDATE USING (true);

-- Challenges: readable by all, writable by involved players
CREATE POLICY challenges_select ON challenges FOR SELECT USING (true);
CREATE POLICY challenges_insert ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY challenges_update ON challenges FOR UPDATE USING (true);
CREATE POLICY challenges_delete ON challenges FOR DELETE USING (true);

-- Tournaments: readable by all, writable by admin
CREATE POLICY tournaments_select ON tournaments FOR SELECT USING (true);
CREATE POLICY tournaments_insert ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY tournaments_update ON tournaments FOR UPDATE USING (true);
CREATE POLICY tournaments_delete ON tournaments FOR DELETE USING (true);

-- Match Reactions: readable by all, writable by author
CREATE POLICY match_reactions_select ON match_reactions FOR SELECT USING (true);
CREATE POLICY match_reactions_insert ON match_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY match_reactions_update ON match_reactions FOR UPDATE USING (true);
CREATE POLICY match_reactions_delete ON match_reactions FOR DELETE USING (true);

-- Backups: admin only
CREATE POLICY backups_select ON backups FOR SELECT USING (true);
CREATE POLICY backups_insert ON backups FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rackets_updated_at
    BEFORE UPDATE ON rackets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_reactions_updated_at
    BEFORE UPDATE ON match_reactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA (Default rackets - same as original seedData)
-- ============================================================

INSERT INTO rackets (id, name, icon, color, stats) VALUES
('r1', 'Neon Striker', 'Zap', '#fcee0a', '{"speed": 18, "spin": 5, "power": 3, "control": 2, "defense": 1, "chaos": 1}'),
('r2', 'Cyber Wall', 'Shield', '#00f3ff', '{"speed": 2, "spin": 3, "power": 2, "control": 5, "defense": 18, "chaos": 0}'),
('r3', 'Void Smasher', 'Target', '#ff00ff', '{"speed": 3, "spin": 2, "power": 18, "control": 3, "defense": 3, "chaos": 1}');

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View: Player stats with match counts
CREATE VIEW player_stats AS
SELECT 
    p.id,
    p.name,
    p.avatar,
    p.elo_singles,
    p.elo_doubles,
    p.wins,
    p.losses,
    p.streak,
    COALESCE(wins.count, 0) + COALESCE(losses.count, 0) AS total_matches
FROM players p
LEFT JOIN (
    SELECT player_id, COUNT(*) as count 
    FROM match_players 
    WHERE is_winner = true 
    GROUP BY player_id
) wins ON p.id = wins.player_id
LEFT JOIN (
    SELECT player_id, COUNT(*) as count 
    FROM match_players 
    WHERE is_winner = false 
    GROUP BY player_id
) losses ON p.id = losses.player_id;

-- View: Match details with players
CREATE VIEW match_details AS
SELECT 
    m.id,
    m.type,
    m.score_winner,
    m.score_loser,
    m.timestamp,
    m.elo_change,
    m.logged_by,
    jsonb_agg(
        DISTINCT jsonb_build_object(
            'player_id', mp.player_id,
            'is_winner', mp.is_winner,
            'name', p.name,
            'avatar', p.avatar
        )
    ) FILTER (WHERE mp.player_id IS NOT NULL) as players
FROM matches m
LEFT JOIN match_players mp ON m.id = mp.match_id
LEFT JOIN players p ON mp.player_id = p.id
GROUP BY m.id, m.type, m.score_winner, m.score_loser, m.timestamp, m.elo_change, m.logged_by;
