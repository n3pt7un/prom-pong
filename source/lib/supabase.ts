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
      persistSession: false,
    },
    realtime: {
      enabled: true,
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  console.log('✅ Supabase client initialized with Realtime enabled');
} else {
  if (useSupabase) {
    console.warn('⚠️ USE_SUPABASE is true but missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
}

export { supabase, useSupabase };

export function isSupabaseEnabled(): boolean {
  return useSupabase && supabase !== null;
}
