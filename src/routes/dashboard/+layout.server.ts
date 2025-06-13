import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { eventSchema } from '$lib/validations';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const user = await locals.getUser();
  if (!user) throw redirect(303, '/login');

  const { data: org } = await locals.supabase
    .from('organizations')
    .select('id, name, slug, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, trial_ends_at, payment_up_to_date, org_leaderboard_codes, logo_url, ads_image_url, color_palette')
    .eq('owner_id', user.id)
    .maybeSingle();

  // Only redirect to onboarding if we don't have an org at all, not just missing stripe_customer_id
  if (!org) {
    throw redirect(303, '/onboarding');
  }
  
  // If org exists but missing stripe setup, let the dashboard handle it gracefully
  // This prevents the redirect loop

  // Fetch all events for this organization
  const { data: events, error } = await locals.supabase
    .from('events')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading events:', error);
    return {
      user,
      org,
      organizations: org ? [org] : [],
      events: []
    };
  }

  // Validate events against the schema
  const validatedEvents = events
    .map(event => {
      const result = eventSchema.safeParse(event);
      if (!result.success) {
        console.warn('Invalid event data:', event, result.error);
        return null;
      }
      return result.data;
    })
    .filter(Boolean);

  return {
    user,
    org,
    organizations: org ? [org] : [],
    events: validatedEvents
  };
};
