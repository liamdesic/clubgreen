import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { createServerClient } from '$lib/supabase/server'

export const load: PageServerLoad = async ({ url, cookies }) => {
  const supabase = createServerClient(cookies)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const redirectTo = url.pathname === '/dashboard' ? '' : `?redirectTo=${encodeURIComponent(url.pathname)}`
    throw redirect(303, `/login${redirectTo}`)
  }

  // Get user's organizations
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', session.user.id)

  if (error) {
    console.error('Error fetching organizations:', error)
    return {
      organizations: [],
      user: session.user,
      events: []
    }
  }

  // Get events for the first organization if available
  let events = []
  if (organizations && organizations.length > 0) {
    const { data: orgEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('organization_id', organizations[0].id)
      .order('event_date', { ascending: false })

    if (!eventsError) {
      events = orgEvents || []
    } else {
      console.error('Error fetching events:', eventsError)
    }
  }

  return {
    organizations: organizations || [],
    user: session.user,
    events
  }
};
