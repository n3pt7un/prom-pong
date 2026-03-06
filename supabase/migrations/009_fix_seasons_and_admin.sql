-- Fix missing columns in players table for singles/doubles stats split
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS wins_singles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses_singles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_singles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins_doubles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses_doubles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_doubles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS league_id TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_players_league_id ON players(league_id);

-- Add season_id to matches table to track which season a match belongs to
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS season_id TEXT,
  ADD COLUMN IF NOT EXISTS is_friendly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS match_format TEXT CHECK (match_format IN ('standard11', 'vintage21'));

-- Add foreign key constraint for season_id (ignore if already exists)
DO $$ BEGIN
  ALTER TABLE matches ADD CONSTRAINT fk_matches_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add index for season_id
CREATE INDEX IF NOT EXISTS idx_matches_season_id ON matches(season_id);

-- Create leagues table if it doesn't exist
CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leagues_created_by ON leagues(created_by);

-- Enable RLS on leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Leagues: readable by all, writable by creator or admin
DROP POLICY IF EXISTS leagues_select ON leagues;
CREATE POLICY leagues_select ON leagues FOR SELECT USING (true);
DROP POLICY IF EXISTS leagues_insert ON leagues;
CREATE POLICY leagues_insert ON leagues FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS leagues_update ON leagues;
CREATE POLICY leagues_update ON leagues FOR UPDATE USING (true);
DROP POLICY IF EXISTS leagues_delete ON leagues;
CREATE POLICY leagues_delete ON leagues FOR DELETE USING (true);

-- Add trigger for leagues updated_at
DROP TRIGGER IF EXISTS update_leagues_updated_at ON leagues;
CREATE TRIGGER update_leagues_updated_at
    BEFORE UPDATE ON leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for players.league_id (ignore if already exists)
DO $$ BEGIN
  ALTER TABLE players ADD CONSTRAINT fk_players_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create correction_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS correction_requests (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    proposed_winners TEXT[] NOT NULL,
    proposed_losers TEXT[] NOT NULL,
    proposed_score_winner INTEGER NOT NULL,
    proposed_score_loser INTEGER NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_correction_requests_match_id ON correction_requests(match_id);
CREATE INDEX IF NOT EXISTS idx_correction_requests_status ON correction_requests(status);
CREATE INDEX IF NOT EXISTS idx_correction_requests_requested_by ON correction_requests(requested_by);

-- Enable RLS on correction_requests
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

-- Correction requests: readable by all, writable by authenticated
DROP POLICY IF EXISTS correction_requests_select ON correction_requests;
CREATE POLICY correction_requests_select ON correction_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS correction_requests_insert ON correction_requests;
CREATE POLICY correction_requests_insert ON correction_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS correction_requests_update ON correction_requests;
CREATE POLICY correction_requests_update ON correction_requests FOR UPDATE USING (true);
DROP POLICY IF EXISTS correction_requests_delete ON correction_requests;
CREATE POLICY correction_requests_delete ON correction_requests FOR DELETE USING (true);

-- Create archived_matches table to store matches from completed seasons
CREATE TABLE IF NOT EXISTS archived_matches (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('singles', 'doubles')),
    score_winner INTEGER NOT NULL,
    score_loser INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    elo_change INTEGER NOT NULL,
    logged_by TEXT,
    is_friendly BOOLEAN NOT NULL DEFAULT false,
    match_format TEXT CHECK (match_format IN ('standard11', 'vintage21')),
    league_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_matches_season_id ON archived_matches(season_id);
CREATE INDEX IF NOT EXISTS idx_archived_matches_timestamp ON archived_matches(timestamp DESC);

-- Create archived_match_players table
CREATE TABLE IF NOT EXISTS archived_match_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archived_match_id TEXT NOT NULL REFERENCES archived_matches(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_winner BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_match_players_match_id ON archived_match_players(archived_match_id);
CREATE INDEX IF NOT EXISTS idx_archived_match_players_player_id ON archived_match_players(player_id);

-- Enable RLS on archived tables
ALTER TABLE archived_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_match_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS archived_matches_select ON archived_matches;
CREATE POLICY archived_matches_select ON archived_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS archived_match_players_select ON archived_match_players;
CREATE POLICY archived_match_players_select ON archived_match_players FOR SELECT USING (true);

-- Create function to archive matches when season ends
CREATE OR REPLACE FUNCTION archive_season_matches(p_season_id TEXT)
RETURNS void AS $$
BEGIN
    -- Copy matches to archived_matches
    INSERT INTO archived_matches (
        id, season_id, type, score_winner, score_loser, timestamp, 
        elo_change, logged_by, is_friendly, match_format, league_id, archived_at
    )
    SELECT 
        id, p_season_id, type, score_winner, score_loser, timestamp,
        elo_change, logged_by, is_friendly, match_format, league_id, NOW()
    FROM matches
    WHERE season_id = p_season_id OR season_id IS NULL;
    
    -- Copy match_players to archived_match_players
    INSERT INTO archived_match_players (archived_match_id, player_id, is_winner)
    SELECT mp.match_id, mp.player_id, mp.is_winner
    FROM match_players mp
    INNER JOIN matches m ON mp.match_id = m.id
    WHERE m.season_id = p_season_id OR m.season_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
    (SELECT COUNT(*) FROM players) as total_players,
    (SELECT COUNT(*) FROM matches) as total_matches,
    (SELECT COUNT(*) FROM seasons WHERE status = 'active') as active_seasons,
    (SELECT COUNT(*) FROM seasons WHERE status = 'completed') as completed_seasons,
    (SELECT COUNT(*) FROM leagues) as total_leagues,
    (SELECT COUNT(*) FROM pending_matches WHERE status = 'pending') as pending_matches,
    (SELECT COUNT(*) FROM correction_requests WHERE status = 'pending') as pending_corrections,
    (SELECT COUNT(*) FROM admins) as total_admins;
