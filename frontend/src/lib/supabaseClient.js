import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Sign-in will not work until they are configured in frontend/.env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);