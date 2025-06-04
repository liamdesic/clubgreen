// Client-side Supabase client using the modern @supabase/ssr approach
// This file should be imported ONLY in client-side code (.svelte components)

import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './database.types';

// Create a singleton browser client for client-side usage
export const supabase = createBrowserClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);

// Export the type for convenience
export type { Session } from '@supabase/supabase-js';
