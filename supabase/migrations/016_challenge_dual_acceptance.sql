-- Auto-generated challenges require both sides to approve.
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS challenger_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS challenged_accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_challenges_challenger_accepted_at
  ON challenges(challenger_accepted_at);

CREATE INDEX IF NOT EXISTS idx_challenges_challenged_accepted_at
  ON challenges(challenged_accepted_at);
