import { createServerClient } from '$lib/supabase/server'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  // Use the getSession helper from hooks.server.ts
  const { session, user } = await locals.getSession()
  
  // Create a new server client for this request
  const supabase = createServerClient(cookies)
  
  // Return the session, user, and supabase client
  return {
    session,
    user
  }
}
