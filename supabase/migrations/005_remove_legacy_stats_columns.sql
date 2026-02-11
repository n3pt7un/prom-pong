-- Migration: Remove legacy combined stats columns
-- These are now calculated on-the-fly from split singles/doubles stats

-- Drop the dependent view first
DROP VIEW IF EXISTS player_stats;

-- Drop legacy columns (data is preserved in wins_singles, wins_doubles, etc.)
ALTER TABLE players DROP COLUMN IF EXISTS wins;
ALTER TABLE players DROP COLUMN IF EXISTS losses;
ALTER TABLE players DROP COLUMN IF EXISTS streak;

-- Recreate the view using the new split columns
CREATE VIEW player_stats AS
SELECT 
    p.id,
    p.name,
    p.avatar,
    p.elo_singles,
    p.elo_doubles,
    COALESCE(p.wins_singles, 0) + COALESCE(p.wins_doubles, 0) AS wins,
    COALESCE(p.losses_singles, 0) + COALESCE(p.losses_doubles, 0) AS losses,
    GREATEST(COALESCE(p.streak_singles, 0), COALESCE(p.streak_doubles, 0)) AS streak,
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
