import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await locals.getUser();
  if (!user) throw redirect(303, '/login');

  // Fetch organization details
  const { data: organization, error: orgError } = await locals.supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (orgError || !organization) {
    return { 
      error: 'Failed to load organization',
      events: []
    };
  }

  // Fetch all events for this organization
  const { data: events, error: eventsError } = await locals.supabase
    .from('events')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('show_on_main_leaderboard', true) // Only show events marked for leaderboard
    .order('created_at', { ascending: false });

  if (eventsError) {
    console.error('Error loading events:', eventsError);
    return { 
      error: 'Failed to load events',
      events: []
    };
  }

  return {
    org: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug
    },
    events: events || []
  };
};
