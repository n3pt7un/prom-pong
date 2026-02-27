-- Migration 007: Add match_format column to matches table
-- Run this in Supabase SQL editor BEFORE deploying the new backend.
-- Existing matches default to 'vintage21' (the format used before this feature was added).

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_format TEXT NOT NULL DEFAULT 'vintage21'
    CHECK (match_format IN ('standard11', 'vintage21'));
