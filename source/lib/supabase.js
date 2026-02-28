import { createClient } from '@supabase/supabase-js';

// Support both Node.js (process.env) and Vite (import.meta.env)
const env = typeof process !== 'undefined' && process.env
  ? process.env
  : (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env
    : {};

const supabaseUrl = env.SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || '';
const useSupabase = env.USE_SUPABASE === 'true';

let supabase = null;

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

export function isSupabaseEnabled() {
  return useSupabase && supabase !== null;
}
