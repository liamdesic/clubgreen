import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient
      session: Session | null
      user: User | null
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
  )

  // Pass the supabase client to event.locals
  event.locals.supabase = supabase

  // Helper to get both session and user
  event.locals.getSession = async () => {
    console.log('🔍 [hooks.server] Getting session...')
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ [hooks.server] Session error:', sessionError.message)
        return { session: null, user: null }
      }

      if (!session) {
        console.log('ℹ️ [hooks.server] No session found')
        return { session: null, user: null }
      }
      
      console.log('🔑 [hooks.server] Session found, verifying with getUser...')
      
      // Always verify the session by getting the user
      const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token)
      
      if (userError) {
        console.error('❌ [hooks.server] User verification failed:', userError.message)
        return { session: null, user: null }
      }

      if (!user) {
        console.error('❌ [hooks.server] Session verification failed: User from sub claim in JWT does not exist')
        return { session: null, user: null }
      }
      
      console.log('✅ [hooks.server] Session verified for user:', user.email)
      return { session, user }
    } catch (error) {
      console.error('❌ [hooks.server] Unexpected error during session verification:', error)
      return { session: null, user: null }
    }
  }

  // Get the current session and user
  const { session, user } = await event.locals.getSession()
  event.locals.session = session
  event.locals.user = user

  // If we're on the auth callback route, handle the callback
  if (event.url.pathname === '/auth/callback') {
    const code = event.url.searchParams.get('code')
    const type = event.url.searchParams.get('type')
    
    if (code && !user) {
      try {
        await supabase.auth.exchangeCodeForSession(code)
        // Re-check session after exchange
        const { session: newSession, user: newUser } = await event.locals.getSession()
        event.locals.session = newSession
        event.locals.user = newUser

        // If this is a new signup, redirect to onboarding
        if (type === 'signup' || type === 'signup_confirm') {
          throw redirect(303, '/onboarding')
        }

        // Otherwise redirect to dashboard
        throw redirect(303, '/dashboard')
      } catch (error) {
        if (error instanceof Response) throw error // Rethrow redirect
        console.error('❌ [hooks.server] Code exchange failed:', error)
        throw redirect(303, '/login?error=' + encodeURIComponent('Authentication failed. Please try again.'))
      }
    }
  }

  // Resolve the event
  const response = await resolve(event)
  return response
}
