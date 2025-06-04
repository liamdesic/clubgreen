// Server-side only Supabase client with admin privileges
// This file should ONLY be imported in server-side code (+page.server.ts, +server.ts, etc.)

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Database } from '$lib/database.types';

// Create a server-side admin client with service role key
const supabaseAdmin = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export { supabaseAdmin };
