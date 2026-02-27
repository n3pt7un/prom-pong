-- Migration 008: Add correction_requests tables
-- Run this in Supabase SQL editor BEFORE deploying the new backend.

CREATE TABLE IF NOT EXISTS correction_requests (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,            -- Firebase UID of the requester
  proposed_score_winner INTEGER NOT NULL,
  proposed_score_loser INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_correction_requests_match_id ON correction_requests(match_id);
CREATE INDEX IF NOT EXISTS idx_correction_requests_status ON correction_requests(status);
CREATE INDEX IF NOT EXISTS idx_correction_requests_requested_by ON correction_requests(requested_by);

-- Junction table: which players are proposed winners/losers for this correction
CREATE TABLE IF NOT EXISTS correction_request_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL REFERENCES correction_requests(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  is_winner BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_correction_request_players_request_id ON correction_request_players(request_id);
