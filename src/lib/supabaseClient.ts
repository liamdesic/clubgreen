import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

let supabaseUrl: string;
let supabaseAnonKey: string;

// In a server context, we need to handle the case where import.meta.env might not be available
try {
  // Try both naming conventions for environment variables (VITE_ and PUBLIC_)
  // In production, these might be loaded asynchronously, so we need to handle that
  if (typeof window !== 'undefined' && window.ENV_PUBLIC_SUPABASE_URL) {
    // Some hosting providers inject env vars into window.ENV_*
    supabaseUrl = window.ENV_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = window.ENV_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    // Standard Vite/SvelteKit env vars
    supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  
  // Hardcoded fallback values for development only
  if (browser && window.location.hostname === 'localhost') {
    if (!supabaseUrl) {
      console.warn('Using fallback Supabase URL for localhost development');
      supabaseUrl = 'https://xkqioergzocysebvrhcs.supabase.co';
    }
    
    // Note: In a real app, NEVER hardcode the anon key in the client code
    // This is only for development convenience
    if (!supabaseAnonKey) {
      console.warn('Using fallback Supabase Anon Key for localhost development - DO NOT USE IN PRODUCTION');
      // You'll need to replace this with your actual anon key from Supabase dashboard
      // We're using a placeholder here for security reasons
      supabaseAnonKey = 'your-anon-key-goes-here';
    }
  }
  
  // Log environment variables (masking part of the key for security)
  if (browser) {
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Anon Key available:', supabaseAnonKey ? 'Yes' : 'No');
    console.log('Environment variable names checked:', 
      'PUBLIC_SUPABASE_URL, VITE_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, VITE_SUPABASE_ANON_KEY');
  }
} catch (e) {
  // This will happen during SSR if env vars aren't available
  supabaseUrl = '';
  supabaseAnonKey = '';
  console.warn('Supabase environment variables not available in this context', e);
}

// Create a real client if we're in the browser and have credentials
let supabase: SupabaseClient;

if (browser && supabaseUrl && supabaseAnonKey) {
  // Create a real Supabase client for browser use
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // For server-side rendering, create a minimal mock that won't throw errors
  // This is a simplified mock that just returns empty data for common operations
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
    channel: (channelName: string) => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: () => Promise.resolve(),
  } as unknown as SupabaseClient;
}

export { supabase };