/**
 * Supabase Client Configuration
 * 
 * This module provides the Supabase client instance for database operations.
 * It uses the service role key for backend operations (full database access).
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your Supabase service role key
 * 
 * Optional:
 *   USE_SUPABASE - Set to 'true' to use Supabase instead of JSON file/GCS
 *   GCS_BUCKET - Still used for file storage (avatars, etc.) if configured
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const useSupabase = process.env.USE_SUPABASE === 'true';

let supabase: SupabaseClient | null = null;

if (useSupabase && supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase client initialized');
} else {
  if (useSupabase) {
    console.warn('⚠️ USE_SUPABASE is true but missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
}

export { supabase, useSupabase };

// Helper function to check if Supabase is available
export function isSupabaseEnabled(): boolean {
  return useSupabase && supabase !== null;
}

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          avatar: string | null;
          bio: string | null;
          elo_singles: number;
          elo_doubles: number;
          wins: number;
          losses: number;
          streak: number;
          joined_at: string;
          main_racket_id: string | null;
          firebase_uid: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['players']['Row']>;
        Update: Partial<Database['public']['Tables']['players']['Row']>;
      };
      matches: {
        Row: {
          id: string;
          type: 'singles' | 'doubles';
          score_winner: number;
          score_loser: number;
          timestamp: string;
          elo_change: number;
          logged_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['matches']['Row']>;
        Update: Partial<Database['public']['Tables']['matches']['Row']>;
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          is_winner: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['match_players']['Row']>;
        Update: Partial<Database['public']['Tables']['match_players']['Row']>;
      };
      rackets: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          stats: {
            speed: number;
            spin: number;
            power: number;
            control: number;
            defense: number;
            chaos: number;
          };
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['rackets']['Row']>;
        Update: Partial<Database['public']['Tables']['rackets']['Row']>;
      };
      admins: {
        Row: {
          id: string;
          firebase_uid: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['admins']['Row']>;
        Update: Partial<Database['public']['Tables']['admins']['Row']>;
      };
      pending_matches: {
        Row: {
          id: string;
          type: 'singles' | 'doubles';
          score_winner: number;
          score_loser: number;
          logged_by: string;
          status: 'pending' | 'confirmed' | 'disputed' | 'rejected';
          confirmations: string[];
          created_at: string;
          expires_at: string;
        };
        Insert: Partial<Database['public']['Tables']['pending_matches']['Row']>;
        Update: Partial<Database['public']['Tables']['pending_matches']['Row']>;
      };
      pending_match_players: {
        Row: {
          id: string;
          pending_match_id: string;
          player_id: string;
          is_winner: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['pending_match_players']['Row']>;
        Update: Partial<Database['public']['Tables']['pending_match_players']['Row']>;
      };
      elo_history: {
        Row: {
          id: string;
          player_id: string;
          match_id: string | null;
          new_elo: number;
          timestamp: string;
          game_type: 'singles' | 'doubles';
        };
        Insert: Partial<Database['public']['Tables']['elo_history']['Row']>;
        Update: Partial<Database['public']['Tables']['elo_history']['Row']>;
      };
      seasons: {
        Row: {
          id: string;
          name: string;
          number: number;
          status: 'active' | 'completed';
          started_at: string;
          ended_at: string | null;
          final_standings: any[];
          match_count: number;
          champion_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['seasons']['Row']>;
        Update: Partial<Database['public']['Tables']['seasons']['Row']>;
      };
      challenges: {
        Row: {
          id: string;
          challenger_id: string;
          challenged_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'completed';
          wager: number;
          message: string | null;
          match_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['challenges']['Row']>;
        Update: Partial<Database['public']['Tables']['challenges']['Row']>;
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          format: 'single_elimination' | 'round_robin';
          status: 'registration' | 'in_progress' | 'completed';
          game_type: 'singles' | 'doubles';
          player_ids: string[];
          rounds: any[];
          created_by: string;
          winner_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['tournaments']['Row']>;
        Update: Partial<Database['public']['Tables']['tournaments']['Row']>;
      };
      match_reactions: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          emoji: string;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['match_reactions']['Row']>;
        Update: Partial<Database['public']['Tables']['match_reactions']['Row']>;
      };
    };
  };
}
