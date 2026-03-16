-- Add metadata fields for generated challenges and richer lifecycle tracking.
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'singles',
ADD COLUMN IF NOT EXISTS league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS generation_reason TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'challenges_source_check'
  ) THEN
    ALTER TABLE challenges
    ADD CONSTRAINT challenges_source_check
    CHECK (source IN ('manual', 'auto_generated', 'tournament'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'challenges_game_type_check'
  ) THEN
    ALTER TABLE challenges
    ADD CONSTRAINT challenges_game_type_check
    CHECK (game_type IN ('singles', 'doubles'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_challenges_source ON challenges(source);
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_league_id ON challenges(league_id);
