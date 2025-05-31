import { createServerClient } from '@supabase/ssr'
import { redirect, type Handle } from '@sveltejs/kit'

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
  event.locals.supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: '/' })
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' })
        },
      },
    }
  )

  // Helper to get both session and user
  event.locals.getSession = async () => {
    console.log('🔍 [hooks.server] Getting session...')
    const { data: { session }, error: sessionError } = await event.locals.supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ [hooks.server] Error getting session:', sessionError)
      return { session: null, user: null }
    }
    
    if (!session) {
      console.log('ℹ️ [hooks.server] No active session found')
      return { session: null, user: null }
    }
    
    console.log('🔑 [hooks.server] Session found, verifying with getUser...')
    
    // Always verify the session by getting the user
    const { data: { user }, error: userError } = await event.locals.supabase.auth.getUser(session.access_token)
    
    if (userError || !user) {
      console.error('❌ [hooks.server] Session verification failed:', userError)
      return { session: null, user: null }
    }
    
    console.log('✅ [hooks.server] Session verified for user:', user.email)
    return { session, user }
  }

  // Get the current session and user
  const { session, user } = await event.locals.getSession()
  event.locals.session = session
  event.locals.user = user

  // Resolve the event
  const response = await resolve(event)

  return response
}
