import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createServerClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ url, cookies }) => {
  const supabase = createServerClient(cookies);
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Check if logged in
  if (!session) {
    const redirectTo =
      url.pathname === '/dashboard' ? '' : `?redirectTo=${encodeURIComponent(url.pathname)}`;
    throw redirect(303, `/login${redirectTo}`);
  }

  // 2. Get user's organizations
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', session.user.id);

  // 3. If error fetching orgs, log error and return empty arrays
  if (orgError) {
    console.error('Error fetching organizations:', orgError);
    return {
      organizations: [],
      user: session.user,
      events: []
    };
  }

  // 4. Redirect to onboarding if user has NO organization
  if (!organizations || organizations.length === 0) {
    throw redirect(303, '/onboarding');
  }

  // 5. Get events for the first organization
  let events: any[] = [];
  const orgId = organizations[0]?.id;

  if (orgId) {
    const { data: orgEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('organization_id', orgId)
      .order('event_date', { ascending: false });

    if (!eventsError) {
      events = orgEvents || [];
    } else {
      console.error('Error fetching events:', eventsError);
    }
  }

  // 6. Return all data
  return {
    organizations,
    user: session.user,
    events
  };
};
