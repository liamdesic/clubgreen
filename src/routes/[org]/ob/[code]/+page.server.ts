import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  try {
    // Get the organization from the code
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('leaderboard_code', params.code)
      .single();

    if (orgError || !orgData) {
      throw new Error('Organization not found');
    }

    // Get the organization's events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, access_uuid, short_code, event_date')
      .eq('organization_id', orgData.id)
      .order('event_date', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      throw eventsError;
    }

    // Get the first event's leaderboard data
    let leaderboardData = null;
    if (events && events.length > 0) {
      const { data: leaderboard, error: leaderboardError } = await supabase
        .from('leaderboard_snapshot')
        .select('scores')
        .eq('event_id', events[0].id)
        .eq('time_filter', 'all_time')
        .single();

      if (!leaderboardError && leaderboard) {
        leaderboardData = leaderboard.scores;
      }
    }

    return {
      organization: orgData,
      events,
      leaderboard: leaderboardData,
      currentEventId: events?.[0]?.id || null,
    };
  } catch (error) {
    console.error('Error in leaderboard page load:', error);
    throw redirect(303, '/');
  }
};
