import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';
import type { Database } from './database.types';

declare global {
  interface ImportMetaEnv {
    PUBLIC_SUPABASE_URL: string;
    PUBLIC_SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a typed Supabase client
type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let supabase: SupabaseClient;

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
  if (import.meta.env.DEV) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const timestamp = new Date().toISOString();
      if (session?.user) {
        console.log(`[${timestamp}] Auth state changed: ${event} - User: ${session.user.email}`);
      } else {
        console.log(`[${timestamp}] Auth state changed: ${event} - No user session`);
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