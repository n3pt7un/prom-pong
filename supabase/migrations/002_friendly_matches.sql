-- Migration: Add friendly match support
-- Friendly matches skip ELO changes but still count in player statistics

ALTER TABLE matches ADD COLUMN is_friendly BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pending_matches ADD COLUMN is_friendly BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering friendly vs ranked matches
CREATE INDEX idx_matches_is_friendly ON matches(is_friendly);
