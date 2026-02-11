-- Enable Realtime for tables to support live updates
-- This migration enables Realtime broadcasts on all league-related tables

-- First, check if the realtime extension is enabled
CREATE EXTENSION IF NOT EXISTS "realtime";

-- Enable Realtime on tables by adding them to the publication
-- Note: supabase_realtime publication is created automatically by Supabase
-- We use a DO block to safely add tables (ignoring if already added)

DO $$
BEGIN
    -- Add tables to the realtime publication (safe to run multiple times)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE players;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table players already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE matches;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table matches already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table match_players already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE elo_history;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table elo_history already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE pending_matches;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table pending_matches already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE pending_match_players;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table pending_match_players already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE seasons;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table seasons already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table challenges already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table tournaments already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE match_reactions;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table match_reactions already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE rackets;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table rackets already in publication';
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE leagues;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table leagues already in publication';
    END;
END $$;

-- Create a comment documenting the change
COMMENT ON PUBLICATION supabase_realtime IS 'Realtime publication for CyberPong league tables - enabled for live updates';
