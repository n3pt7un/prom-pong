-- Migration 011: Fix schema inconsistencies introduced by out-of-order migrations
--
-- Problems fixed:
--   1. correction_requests: Migration 008 created the table without proposed_winners/proposed_losers
--      arrays. Migration 009 attempted to recreate it (IF NOT EXISTS = no-op), so those columns
--      were never added. Server code expects them.
--   2. correction_request_players: Junction table created by migration 008 is orphaned — server
--      code uses the array-column approach from 009. Drop it.
--   3. leagues: Migration 003 created leagues without updated_at. Migration 009 added a trigger
--      that updates updated_at but never added the column (CREATE TABLE IF NOT EXISTS = no-op).
--      Any UPDATE on leagues currently throws a DB error.
--   4. matches.match_format: Defensive fix — ensure DEFAULT is set regardless of migration order.

-- Fix 1: Add missing array columns to correction_requests
ALTER TABLE correction_requests
  ADD COLUMN IF NOT EXISTS proposed_winners TEXT[],
  ADD COLUMN IF NOT EXISTS proposed_losers TEXT[];

-- Fix 2: Drop orphaned junction table from migration 008 (no server code uses it)
DROP TABLE IF EXISTS correction_request_players;

-- Fix 3: Add missing updated_at column to leagues
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Fix 4: Ensure match_format has a default value (guards against migration ordering issues)
ALTER TABLE matches
  ALTER COLUMN match_format SET DEFAULT 'vintage21';

-- Update existing NULL match_format rows to the default (defensive)
UPDATE matches SET match_format = 'vintage21' WHERE match_format IS NULL;
