// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.49.8/mod.d.ts"
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.gen.ts';

// Create a typed Supabase client
export function createClient(supabaseUrl: string, supabaseKey: string): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        // @ts-ignore - This is needed for Deno
        fetch: fetch,
      },
    }
  ) as SupabaseClient<Database>;
}

// Global type for Deno
declare global {
  // deno-lint-ignore no-namespace
  namespace Deno {
    export interface Env {
      get(key: string): string | undefined;
    }
  }
}
