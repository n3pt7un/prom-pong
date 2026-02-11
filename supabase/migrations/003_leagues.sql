-- Migration: Add leagues/groups support
-- Allows organizing players into leagues with optional cross-league play

-- Leagues table
CREATE TABLE leagues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add league_id to players (nullable – no league = global only)
ALTER TABLE players ADD COLUMN league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL;

-- Add league_id to matches (nullable – null = global/cross-league match)
ALTER TABLE matches ADD COLUMN league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL;

-- Indexes for efficient filtering
CREATE INDEX idx_players_league_id ON players(league_id);
CREATE INDEX idx_matches_league_id ON matches(league_id);

-- RLS policies for leagues (same open pattern as existing tables)
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to leagues" ON leagues FOR SELECT USING (true);
CREATE POLICY "Allow insert access to leagues" ON leagues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to leagues" ON leagues FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to leagues" ON leagues FOR DELETE USING (true);
