import { createServerClient } from '$lib/supabase/server'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  // Use the getSession helper from hooks.server.ts
  const { session, user } = await locals.getSession()
  
  // Return the session and user
  return {
    session,
    user
  }
}
