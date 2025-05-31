// check supabase-tables.md at project root for supabase table schemas

import { createBrowserClient } from '@supabase/ssr';
import { browser, dev } from '$app/environment';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Define Session type locally to avoid module resolution issues
type Session = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  };
};

export type { Session };

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a typed Supabase client
let supabase: SupabaseClient<Database>;

// Initialize Supabase client based on the environment
if (browser) {
  // In the browser, create a real Supabase client
  supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Add auth state change listener for debugging in development
  if (dev) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const timestamp = new Date().toISOString();
      
      // Skip if no session
      if (!session) {
        console.log(`[${timestamp}] Auth state changed: ${event} - No session`);
        return;
      }
      
      // Verify the session by getting the user
      const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
      
      if (error || !user) {
        console.log(`[${timestamp}] Auth state changed: ${event} - Session verification failed`);
        return;
      }
      
      console.log(`[${timestamp}] Auth state changed: ${event} - Verified user: ${user.email}`);
    });

    // Cleanup subscription on HMR updates
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        subscription?.unsubscribe();
        console.log('[Supabase] Cleaned up auth subscription due to HMR');
      });
    }
  }
} else {
  // For server-side rendering, create a minimal mock
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
      in: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
      limit: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
      order: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
      single: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithOtp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      verifyOtp: () => Promise.resolve({ data: null, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
      setSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
    // @ts-expect-error Mock implementation doesn't use the channel name
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: () => Promise.resolve(),
  } as unknown as SupabaseClient;
}

export { supabase };