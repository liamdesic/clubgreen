import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  try {
    // Get the organization from the slug
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', params.org)
      .single();

    if (orgError || !orgData) {
      console.error('Organization not found:', orgError);
      throw redirect(303, '/');
    }

    // Get the event by short_code and organization_id
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('short_code', params.shortcode)
      .eq('organization_id', orgData.id)
      .single();

    if (eventError || !eventData) {
      console.error('Event not found:', eventError);
      throw redirect(303, '/');
    }

    return {
      organization: orgData,
      event: eventData
    };
  } catch (error) {
    console.error('Error in leaderboard page load:', error);
    throw redirect(303, '/');
  }
}; 