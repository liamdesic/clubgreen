import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      // getSession is already declared in app.d.ts
      session: Session | null;
      user: User | null;
    }
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Handle Chrome DevTools specific requests
  if (event.url.pathname.startsWith('/.well-known/appspecific/')) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Create a Supabase client with the Auth context of the request
  const supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: '/' })
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' })
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );

  // Pass the supabase client to event.locals
  event.locals.supabase = supabase;

  // Define getSession but don't call it immediately
  // This improves performance for routes that don't need auth
  event.locals.getSession = async () => {
    // Only log in development
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.log('🔍 [hooks.server] Getting session and user...');
    
    try {
      // Get user first for security (recommended by Supabase)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        if (isDev && userError) console.error('❌ [hooks.server] User verification failed:', userError.message);
        return { session: null, user: null };
      }

      // Get session after verifying user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        if (isDev && sessionError) console.error('❌ [hooks.server] Session error:', sessionError.message);
        return { session: null, user: null };
      }
      
      if (isDev) console.log('✅ [hooks.server] Session verified for user:', user.email);
      return { session, user };
    } catch (error) {
      if (isDev) console.error('❌ [hooks.server] Unexpected error during session verification:', error);
      return { session: null, user: null };
    }
  };

  // Resolve the event without waiting for auth
  // Protected routes will call getSession() when needed
  return await resolve(event);
}
