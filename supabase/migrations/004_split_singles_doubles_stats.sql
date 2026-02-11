-- Migration: Split singles/doubles win/loss/streak stats
-- Players now have separate stats for singles and doubles matches

-- Add new columns for singles stats
ALTER TABLE players ADD COLUMN wins_singles INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN losses_singles INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN streak_singles INTEGER NOT NULL DEFAULT 0;

-- Add new columns for doubles stats
ALTER TABLE players ADD COLUMN wins_doubles INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN losses_doubles INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN streak_doubles INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data: copy current wins/losses/streak to both singles and doubles
UPDATE players SET 
    wins_singles = wins,
    losses_singles = losses,
    streak_singles = streak,
    wins_doubles = wins,
    losses_doubles = losses,
    streak_doubles = streak;

-- Drop old combined columns
ALTER TABLE players DROP COLUMN wins;
ALTER TABLE players DROP COLUMN losses;
ALTER TABLE players DROP COLUMN streak;

-- Create indexes for common queries
CREATE INDEX idx_players_wins_singles ON players(wins_singles DESC);
CREATE INDEX idx_players_wins_doubles ON players(wins_doubles DESC);
