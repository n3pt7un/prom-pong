-- Migration 012: Assign all unassigned matches to Season 1 and sync match counts
--
-- Context: All matches logged before season tracking was introduced have season_id = NULL.
-- They should belong to the first season (number = 1). This migration:
--   1. Sets season_id on all NULL matches to the Season 1 id (if it exists)
--   2. Recalculates match_count on ALL seasons to reflect actual match counts

DO $$
DECLARE
  v_season1_id TEXT;
BEGIN
  -- Get the ID of season number 1
  SELECT id INTO v_season1_id
  FROM seasons
  WHERE number = 1
  LIMIT 1;

  IF v_season1_id IS NULL THEN
    RAISE NOTICE 'No season with number = 1 found — skipping match assignment.';
  ELSE
    -- Assign all unassigned matches to Season 1
    UPDATE matches
    SET season_id = v_season1_id
    WHERE season_id IS NULL;

    RAISE NOTICE 'Assigned % matches to Season 1 (%)',
      (SELECT COUNT(*) FROM matches WHERE season_id = v_season1_id),
      v_season1_id;
  END IF;
END $$;

-- Sync match_count on all seasons to reflect actual non-friendly match counts
UPDATE seasons s
SET match_count = (
  SELECT COUNT(*)
  FROM matches m
  WHERE m.season_id = s.id
    AND m.is_friendly = false
);
