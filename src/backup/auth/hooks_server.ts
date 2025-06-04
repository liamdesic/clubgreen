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
        get: (key) => {
          const cookie = event.cookies.get(key);
          // Only log in development and only for debugging critical issues
          const isDev = process.env.NODE_ENV === 'development';
          const isDebug = isDev && false; // Set to true only when debugging cookie issues
          
          if (isDebug && key.startsWith('sb-')) {
            console.log(`[COOKIE] GET ${key}: ${cookie ? 'present' : 'missing'}`);
          }
          return cookie;
        },
        set: (key, value, options) => {
          // Always set path to root to ensure cookies are available across the site
          const cookieOptions = { 
            ...options, 
            path: '/',
            // Ensure cookies work in development
            secure: event.url.protocol === 'https:',
            sameSite: 'lax'
          };
          
          event.cookies.set(key, value, cookieOptions);
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' });
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
    const isDev = process.env.NODE_ENV === 'development';
    const logPrefix = `[AUTH:${event.url.pathname}]`;
    
    try {
      // Get user first for security (recommended by Supabase)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        if (isDev) {
          console.error(`❌ ${logPrefix} Auth failed: ${userError?.message || 'No user found'}`);
        }
        return { session: null, user: null };
      }
      
      if (isDev) {
        console.log(`✅ ${logPrefix} User: ${user.email}`);
      }

      // Get session after verifying user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        if (isDev) {
          console.error(`❌ ${logPrefix} Session error: ${sessionError?.message || 'No session found'}`);
        }
        return { session: null, user: null };
      }
      
      return { session, user };
    } catch (error) {
      if (isDev) {
        console.error(`❌ ${logPrefix} Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return { session: null, user: null };
    }
  };

  // Resolve the event without waiting for auth
  // Protected routes will call getSession() when needed
  return await resolve(event);
}
