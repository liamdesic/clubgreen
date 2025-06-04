import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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

  // Helper to get both session and user
  event.locals.getSession = async () => {
    console.log('🔍 [hooks.server] Getting session...')
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ [hooks.server] Session error or no session:', sessionError?.message)
        return { session: null, user: null }
      }
      
      console.log('🔑 [hooks.server] Session found, verifying with getUser...')
      
      // Always verify the session by getting the user
      const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token)
      
      if (userError || !user) {
        console.error('❌ [hooks.server] Session verification failed:', userError?.message)
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

  // Resolve the event
  const response = await resolve(event)

  return response
}
