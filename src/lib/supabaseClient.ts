// check supabase-tables.md at project root for supabase table schemas

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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

// Create typed Supabase clients
let supabase: SupabaseClient<Database>;

/**
 * Get the appropriate Supabase client based on context
 * This function is safe to use in both client and server contexts
 * @returns The Supabase client
 */
export function getSupabaseClient() {
  return supabase;
}

// Initialize browser Supabase client
if (browser) {
  // In the browser, create a real Supabase client
  supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Add minimal auth state change listener for critical events only
  if (dev) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only log sign in, sign out, and token refresh events
      const criticalEvents = ['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'];
      
      if (criticalEvents.includes(event)) {
        console.log(`[AUTH] ${event} - User: ${session?.user?.email || 'none'}`);
      }
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
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: () => Promise.resolve(),
  } as unknown as SupabaseClient;
}

/**
 * Securely verify a session by checking with the Supabase Auth server
 * This should be used instead of directly accessing the session from storage
 * @returns The verified session and user, or null if verification fails
 */
export async function getSecureSession() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('No session found or session error:', sessionError?.message);
      return { session: null, user: null };
    }
    
    // Verify the session with the server
    const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
    
    if (userError || !user) {
      console.log('Session verification failed:', userError?.message);
      return { session: null, user: null };
    }
    
    return { session, user };
  } catch (error) {
    console.error('Error in getSecureSession:', error);
    return { session: null, user: null };
  }
}

export { supabase };